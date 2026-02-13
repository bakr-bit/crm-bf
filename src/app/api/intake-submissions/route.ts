import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "Pending";

    const submissions = await prisma.intakeSubmission.findMany({
      where: { status: status as "Pending" | "Converted" | "Rejected" },
      orderBy: { submittedAt: "desc" },
      include: {
        intakeLink: {
          include: {
            createdBy: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Intake submissions list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
