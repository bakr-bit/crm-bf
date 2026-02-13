import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { intakeConvertSchema } from "@/lib/validations";
import { findDuplicatePartners } from "@/lib/dedup";
import { createNotificationForAllUsers } from "@/lib/notifications";

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

    const ownerUserId = submission.intakeLink.createdByUserId;

    const result = await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          name: submission.companyName,
          websiteDomain: submission.websiteDomain,
          isDirect: parsed.data.isDirect,
          status: parsed.data.partnerStatus,
          ownerUserId,
        },
      });

      const brand = await tx.brand.create({
        data: {
          partnerId: partner.partnerId,
          name: submission.brandName,
          brandDomain: submission.brandDomain,
          trackingDomain: submission.trackingDomain,
          targetGeos: submission.targetGeos,
          licenseInfo: submission.licenseInfo,
        },
      });

      const contact = await tx.contact.create({
        data: {
          partnerId: partner.partnerId,
          brandId: brand.brandId,
          name: submission.contactName,
          email: submission.contactEmail,
          phone: submission.contactPhone,
          preferredContact: submission.preferredContact,
        },
      });

      await tx.intakeSubmission.update({
        where: { submissionId },
        data: {
          status: "Converted",
          convertedPartnerId: partner.partnerId,
          convertedBrandId: brand.brandId,
          convertedContactId: contact.contactId,
          convertedByUserId: userId,
          convertedAt: new Date(),
        },
      });

      return { partner, brand, contact };
    });

    await Promise.all([
      logAudit({
        userId,
        entity: "Partner",
        entityId: result.partner.partnerId,
        action: "CREATE",
        details: { source: "intake", submissionId, name: result.partner.name },
      }),
      logAudit({
        userId,
        entity: "Brand",
        entityId: result.brand.brandId,
        action: "CREATE",
        details: { source: "intake", submissionId, name: result.brand.name },
      }),
      logAudit({
        userId,
        entity: "Contact",
        entityId: result.contact.contactId,
        action: "CREATE",
        details: { source: "intake", submissionId, name: result.contact.name },
      }),
    ]);

    createNotificationForAllUsers({
      type: "INTAKE_CONVERTED",
      title: "Intake Submission Converted",
      message: `"${submission.companyName}" was converted to Partner + Brand + Contact`,
      entityType: "Partner",
      entityId: result.partner.partnerId,
    }).catch(() => {});

    return NextResponse.json({
      partnerId: result.partner.partnerId,
      brandId: result.brand.brandId,
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
