import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey, resolveActorUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; credentialId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = await resolveActorUserId(request, session);
    if (!userId) {
      return NextResponse.json(
        { error: "Actor required: provide a session or an X-Actor-Email header matching a CRM user" },
        { status: 400 }
      );
    }
    const { partnerId, credentialId } = await params;

    const credential = await prisma.credential.findFirst({
      where: { credentialId, partnerId },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Log the credential access
    await logAudit({
      userId,
      entity: "Credential",
      entityId: credentialId,
      action: "CREDENTIAL_ACCESS",
      details: { label: credential.label, partnerId },
    });

    return NextResponse.json({ password: credential.password });
  } catch (error) {
    console.error("Credential reveal error:", error);
    return NextResponse.json(
      { error: "Failed to reveal credential" },
      { status: 500 }
    );
  }
}
