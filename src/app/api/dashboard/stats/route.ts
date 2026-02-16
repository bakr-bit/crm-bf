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
    const userId = session?.user.id;

    const [
      unassignedPartners,
      missingInfoPartners,
      assetsAwaitingPositions,
    ] = await Promise.all([
      // Partners with no account manager assigned
      prisma.partner.count({
        where: { accountManagerUserId: null },
      }),

      // Partners assigned to current user missing contract, license, or banking
      userId
        ? prisma.partner.count({
            where: {
              accountManagerUserId: userId,
              OR: [
                { hasContract: false },
                { hasLicense: false },
                { hasBanking: false },
              ],
            },
          })
        : Promise.resolve(0),

      // Assets that have pages with zero positions
      prisma.asset.count({
        where: {
          status: "Active",
          pages: {
            some: {
              status: "Active",
              positions: { none: {} },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        unassignedPartners,
        missingInfoPartners,
        assetsAwaitingPositions,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
