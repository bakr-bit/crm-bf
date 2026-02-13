import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

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
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || null;

    const submission = await prisma.intakeSubmission.findUnique({
      where: { submissionId },
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

    await prisma.intakeSubmission.update({
      where: { submissionId },
      data: {
        status: "Rejected",
        rejectedByUserId: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await logAudit({
      userId,
      entity: "IntakeSubmission",
      entityId: submissionId,
      action: "REJECT",
      details: { companyName: submission.companyName, reason },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Intake reject error:", error);
    return NextResponse.json(
      { error: "Failed to reject submission" },
      { status: 500 }
    );
  }
}
