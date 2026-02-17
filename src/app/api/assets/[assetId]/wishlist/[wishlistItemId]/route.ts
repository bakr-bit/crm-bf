import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { wishlistItemUpdateSchema } from "@/lib/validations";

type Params = { params: Promise<{ assetId: string; wishlistItemId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, wishlistItemId } = await params;
    const body = await request.json();
    const parsed = wishlistItemUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.wishlistItem.findFirst({
      where: { wishlistItemId, assetId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Wishlist item not found" },
        { status: 404 }
      );
    }

    // Check unique name if name is being changed
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.wishlistItem.findUnique({
        where: { assetId_name: { assetId, name: parsed.data.name } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A wishlist item with this name already exists for this asset" },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.assignedToUserId !== undefined) updateData.assignedToUserId = parsed.data.assignedToUserId;

    if (parsed.data.contacted !== undefined) {
      updateData.contacted = parsed.data.contacted;
      if (parsed.data.contacted) {
        updateData.contactedAt = new Date();
        updateData.contactedByUserId = userId;
      } else {
        updateData.contactedAt = null;
        updateData.contactedByUserId = null;
      }
    }

    const item = await prisma.wishlistItem.update({
      where: { wishlistItemId },
      data: updateData,
      include: {
        contactedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId,
      entity: "WishlistItem",
      entityId: wishlistItemId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data) },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Wishlist update error:", error);
    return NextResponse.json(
      { error: "Failed to update wishlist item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, wishlistItemId } = await params;

    const existing = await prisma.wishlistItem.findFirst({
      where: { wishlistItemId, assetId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Wishlist item not found" },
        { status: 404 }
      );
    }

    await prisma.wishlistItem.delete({ where: { wishlistItemId } });

    await logAudit({
      userId,
      entity: "WishlistItem",
      entityId: wishlistItemId,
      action: "DELETE",
      details: { name: existing.name, assetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishlist delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete wishlist item" },
      { status: 500 }
    );
  }
}
