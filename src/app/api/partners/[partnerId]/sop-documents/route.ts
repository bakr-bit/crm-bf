import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { supabase, SOP_BUCKET } from "@/lib/supabase";

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DOC_TYPES = ["contract", "license", "banking"] as const;
type DocType = (typeof DOC_TYPES)[number];

const FILE_URL_FIELD: Record<DocType, "contractFileUrl" | "licenseFileUrl" | "bankingFileUrl"> = {
  contract: "contractFileUrl",
  license: "licenseFileUrl",
  banking: "bankingFileUrl",
};

const SOP_SELECT = {
  partnerId: true,
  contractFileUrl: true,
  licenseFileUrl: true,
  bankingFileUrl: true,
} as const;

function isValidDocType(value: string): value is DocType {
  return DOC_TYPES.includes(value as DocType);
}

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf": return "pdf";
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    default: return "bin";
  }
}

// POST — Upload a document
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
    const docType = formData.get("docType") as string | null;

    if (!file || !docType) {
      return NextResponse.json(
        { error: "file and docType are required" },
        { status: 400 }
      );
    }

    if (!isValidDocType(docType)) {
      return NextResponse.json(
        { error: "docType must be contract, license, or banking" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be PDF, PNG, or JPEG" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { partnerId },
      select: SOP_SELECT,
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Delete existing file if replacing
    const existingPath = partner[FILE_URL_FIELD[docType]];
    if (existingPath) {
      await supabase.storage.from(SOP_BUCKET).remove([existingPath]);
    }

    const ext = getExtension(file.type);
    const storagePath = `partners/${partnerId}/${docType}.${ext}`;
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

    await prisma.partner.update({
      where: { partnerId },
      data: { [FILE_URL_FIELD[docType]]: storagePath },
    });

    const userId = session?.user?.id ?? "api";
    await logAudit({
      userId,
      entity: "Partner",
      entityId: partnerId,
      action: "SOP_UPLOAD",
      details: { docType, storagePath },
    });

    return NextResponse.json({ success: true, storagePath });
  } catch (error) {
    console.error("SOP upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// GET — Generate signed download URL
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
    const docType = searchParams.get("docType");

    if (!docType || !isValidDocType(docType)) {
      return NextResponse.json(
        { error: "docType query param must be contract, license, or banking" },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { partnerId },
      select: SOP_SELECT,
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const storagePath = partner[FILE_URL_FIELD[docType]];
    if (!storagePath) {
      return NextResponse.json({ error: "No file found" }, { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from(SOP_BUCKET)
      .createSignedUrl(storagePath, 300); // 5 minutes

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error("SOP download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}

// DELETE — Remove a document
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
    const { docType } = body;

    if (!docType || !isValidDocType(docType)) {
      return NextResponse.json(
        { error: "docType must be contract, license, or banking" },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { partnerId },
      select: SOP_SELECT,
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const storagePath = partner[FILE_URL_FIELD[docType]];
    if (storagePath) {
      const { error: storageError } = await supabase.storage.from(SOP_BUCKET).remove([storagePath]);
      if (storageError) {
        console.error("Storage delete error (non-blocking):", storageError);
      }
    }

    await prisma.partner.update({
      where: { partnerId },
      data: { [FILE_URL_FIELD[docType]]: null },
    });

    const userId = session?.user?.id ?? "api";
    await logAudit({
      userId,
      entity: "Partner",
      entityId: partnerId,
      action: "SOP_DELETE",
      details: { docType },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SOP delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
