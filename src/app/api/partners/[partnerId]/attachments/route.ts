import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { supabase, SOP_BUCKET } from "@/lib/supabase";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// GET — List files or get signed download URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { partnerId } = await params;
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("file");

    // If file param provided, return signed download URL
    if (filePath) {
      const { data, error } = await supabase.storage
        .from(SOP_BUCKET)
        .createSignedUrl(filePath, 300);

      if (error || !data?.signedUrl) {
        console.error("Signed URL error:", error);
        return NextResponse.json(
          { error: "Failed to generate download URL" },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: data.signedUrl });
    }

    // Otherwise list all files for this partner
    const folder = `partners/${partnerId}`;
    const { data, error } = await supabase.storage
      .from(SOP_BUCKET)
      .list(folder, { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error("Storage list error:", error);
      return NextResponse.json(
        { error: "Failed to list attachments" },
        { status: 500 }
      );
    }

    const files = (data ?? [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => ({
        name: f.name,
        path: `${folder}/${f.name}`,
        size: f.metadata?.size ?? 0,
        mimeType: f.metadata?.mimetype ?? null,
        createdAt: f.created_at,
      }));

    return NextResponse.json(files);
  } catch (error) {
    console.error("Attachments list error:", error);
    return NextResponse.json(
      { error: "Failed to list attachments" },
      { status: 500 }
    );
  }
}

// POST — Upload attachment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { partnerId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Supported: PDF, PNG, JPEG, DOC, DOCX, XLS, XLSX, TXT" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { partnerId },
      select: { partnerId: true },
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Sanitize filename - keep original name but make it safe
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `partners/${partnerId}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(SOP_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    const userId = session?.user?.id ?? "api";
    await logAudit({
      userId,
      entity: "Partner",
      entityId: partnerId,
      action: "ATTACHMENT_UPLOAD",
      details: { fileName: safeName, storagePath },
    });

    return NextResponse.json({
      success: true,
      file: { name: safeName, path: storagePath },
    });
  } catch (error) {
    console.error("Attachment upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE — Remove attachment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { partnerId } = await params;
    const body = await request.json();
    const { filePath } = body;

    if (!filePath || !filePath.startsWith(`partners/${partnerId}/`)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    const { error: storageError } = await supabase.storage
      .from(SOP_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    const userId = session?.user?.id ?? "api";
    await logAudit({
      userId,
      entity: "Partner",
      entityId: partnerId,
      action: "ATTACHMENT_DELETE",
      details: { filePath },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Attachment delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
