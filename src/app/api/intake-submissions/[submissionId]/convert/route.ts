import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { intakeConvertSchema } from "@/lib/validations";
import { findDuplicatePartners } from "@/lib/dedup";
import { createNotificationForAllUsers } from "@/lib/notifications";

interface IntakeBrand {
  brandName: string;
  brandDomain?: string;
  targetGeos?: string[];
  licenses?: string[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { submissionId } = await params;
    const body = await request.json();
    const parsed = intakeConvertSchema.safeParse({ ...body, submissionId });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const submission = await prisma.intakeSubmission.findUnique({
      where: { submissionId },
      include: {
        intakeLink: { select: { createdByUserId: true } },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.status !== "Pending") {
      return NextResponse.json(
        { error: `Submission is already ${submission.status}` },
        { status: 400 }
      );
    }

    // Dedup check
    if (!parsed.data.force) {
      const duplicates = await findDuplicatePartners({
        name: submission.companyName,
        websiteDomain: submission.websiteDomain,
      });
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: "Potential duplicate partner found",
            code: "DUPLICATE_PARTNER",
            duplicates,
          },
          { status: 409 }
        );
      }
    }

    const intakeLinkCreatorUserId = submission.intakeLink.createdByUserId;
    const brands = (submission.brands as unknown as IntakeBrand[]) || [];

    const result = await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          name: submission.companyName,
          websiteDomain: submission.websiteDomain,
          isDirect: parsed.data.isDirect,
          status: parsed.data.partnerStatus,
          accountManagerUserId: intakeLinkCreatorUserId,
        },
      });

      const createdBrands = [];
      for (const b of brands) {
        const brand = await tx.brand.create({
          data: {
            partnerId: partner.partnerId,
            name: b.brandName,
            brandDomain: b.brandDomain,
            targetGeos: b.targetGeos ?? [],
            licenses: b.licenses ?? [],
          },
        });
        createdBrands.push(brand);
      }

      const contact = await tx.contact.create({
        data: {
          partnerId: partner.partnerId,
          brandId: createdBrands[0]?.brandId,
          name: submission.contactName,
          email: submission.contactEmail || "",
          phone: submission.contactPhone,
          telegram: submission.contactTelegram,
          whatsapp: submission.contactWhatsapp,
          preferredContact: submission.preferredContact,
        },
      });

      await tx.intakeSubmission.update({
        where: { submissionId },
        data: {
          status: "Converted",
          convertedPartnerId: partner.partnerId,
          convertedBrandIds: createdBrands.map((b) => b.brandId),
          convertedContactId: contact.contactId,
          convertedByUserId: userId,
          convertedAt: new Date(),
        },
      });

      return { partner, brands: createdBrands, contact };
    });

    const auditPromises = [
      logAudit({
        userId,
        entity: "Partner",
        entityId: result.partner.partnerId,
        action: "CREATE",
        details: { source: "intake", submissionId, name: result.partner.name },
      }),
      logAudit({
        userId,
        entity: "Contact",
        entityId: result.contact.contactId,
        action: "CREATE",
        details: { source: "intake", submissionId, name: result.contact.name },
      }),
      ...result.brands.map((brand) =>
        logAudit({
          userId,
          entity: "Brand",
          entityId: brand.brandId,
          action: "CREATE",
          details: { source: "intake", submissionId, name: brand.name },
        })
      ),
    ];
    await Promise.all(auditPromises);

    createNotificationForAllUsers({
      type: "INTAKE_CONVERTED",
      title: "Sign Up Submission Converted",
      message: `"${submission.companyName}" was converted to Partner + ${result.brands.length} Brand(s) + Contact`,
      entityType: "Partner",
      entityId: result.partner.partnerId,
    }).catch(() => {});

    return NextResponse.json({
      partnerId: result.partner.partnerId,
      brandIds: result.brands.map((b) => b.brandId),
      contactId: result.contact.contactId,
    });
  } catch (error) {
    console.error("Intake convert error:", error);
    return NextResponse.json(
      { error: "Failed to convert submission" },
      { status: 500 }
    );
  }
}
