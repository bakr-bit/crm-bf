import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { affiliateLinkUpdateSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ brandId: string; affiliateLinkId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { brandId, affiliateLinkId } = await params;
    const body = await request.json();
    const parsed = affiliateLinkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.affiliateLink.findFirst({
      where: { affiliateLinkId, brandId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Affiliate link not found" },
        { status: 404 }
      );
    }

    // If label changed, check uniqueness
    if (parsed.data.label && parsed.data.label !== existing.label) {
      const dup = await prisma.affiliateLink.findUnique({
        where: {
          brandId_label: {
            brandId,
            label: parsed.data.label,
          },
        },
      });
      if (dup) {
        return NextResponse.json(
          { error: "An affiliate link with this label already exists for this brand" },
          { status: 409 }
        );
      }
    }

    const affiliateLink = await prisma.affiliateLink.update({
      where: { affiliateLinkId },
      data: parsed.data,
    });

    await logAudit({
      userId,
      entity: "AffiliateLink",
      entityId: affiliateLinkId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data), brandId },
    });

    return NextResponse.json(affiliateLink);
  } catch (error) {
    console.error("Affiliate link update error:", error);
    return NextResponse.json(
      { error: "Failed to update affiliate link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brandId: string; affiliateLinkId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { brandId, affiliateLinkId } = await params;

    const existing = await prisma.affiliateLink.findFirst({
      where: { affiliateLinkId, brandId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Affiliate link not found" },
        { status: 404 }
      );
    }

    // Check if any deals reference this affiliate link
    const dealsUsing = await prisma.deal.count({
      where: { affiliateLinkId },
    });

    if (dealsUsing > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${dealsUsing} deal(s) reference this affiliate link` },
        { status: 409 }
      );
    }

    await prisma.affiliateLink.delete({
      where: { affiliateLinkId },
    });

    await logAudit({
      userId,
      entity: "AffiliateLink",
      entityId: affiliateLinkId,
      action: "DELETE",
      details: { label: existing.label, brandId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Affiliate link delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete affiliate link" },
      { status: 500 }
    );
  }
}
