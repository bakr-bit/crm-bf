import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { intakeSubmissionCreateSchema } from "@/lib/validations";
import { createNotificationForAllUsers } from "@/lib/notifications";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const link = await prisma.intakeLink.findUnique({
      where: { tokenHash },
    });

    if (!link) {
      return NextResponse.json(
        { valid: false, error: "Invalid link" },
        { status: 404 }
      );
    }

    if (link.usedAt) {
      return NextResponse.json(
        { valid: false, error: "This link has already been used" },
        { status: 410 }
      );
    }

    if (new Date() > link.expiresAt) {
      return NextResponse.json(
        { valid: false, error: "This link has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({ valid: true, expiresAt: link.expiresAt });
  } catch (error) {
    console.error("Intake token validate error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate link" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const link = await prisma.intakeLink.findUnique({
      where: { tokenHash },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Invalid link" },
        { status: 404 }
      );
    }

    if (link.usedAt) {
      return NextResponse.json(
        { error: "This link has already been used" },
        { status: 410 }
      );
    }

    if (new Date() > link.expiresAt) {
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 410 }
      );
    }

    const body = await request.json();
    const parsed = intakeSubmissionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.intakeSubmission.create({
        data: {
          intakeLinkId: link.intakeLinkId,
          companyName: parsed.data.companyName,
          websiteDomain: parsed.data.websiteDomain,
          brands: parsed.data.brands,
          contactName: parsed.data.contactName,
          contactEmail: parsed.data.contactEmail,
          contactPhone: parsed.data.contactPhone,
          contactTelegram: parsed.data.contactTelegram,
          preferredContact: parsed.data.preferredContact,
          notes: parsed.data.notes,
        },
      });

      await tx.intakeLink.update({
        where: { intakeLinkId: link.intakeLinkId },
        data: { usedAt: new Date() },
      });

      return sub;
    });

    createNotificationForAllUsers({
      type: "INTAKE_SUBMISSION",
      title: "New Intake Submission",
      message: `New partner intake from "${parsed.data.companyName}" (${parsed.data.contactName})`,
      entityType: "IntakeSubmission",
      entityId: submission.submissionId,
    }).catch(() => {});

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Intake submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit intake form" },
      { status: 500 }
    );
  }
}
