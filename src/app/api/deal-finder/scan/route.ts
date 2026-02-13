import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { scanAssetSchema } from "@/lib/validations";
import {
  extractLinks,
  isLikelyAffiliateLink,
  matchBrand,
  matchDeal,
  type BrandInfo,
  type DealInfo,
} from "@/lib/link-scanner";
import { normalizeDomain } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const body = await request.json();
    const parsed = scanAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { assetId } = parsed.data;

    // 1. Look up asset
    const asset = await prisma.asset.findUnique({
      where: { assetId },
    });

    if (!asset || !asset.assetDomain) {
      return NextResponse.json(
        { error: "Asset not found or has no domain" },
        { status: 404 }
      );
    }

    const scannedUrl = `https://${asset.assetDomain}`;

    // 2. Fetch HTML
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(scannedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CRM-Scanner/1.0)",
        },
      });
      clearTimeout(timeout);
      html = await response.text();
    } catch (fetchError) {
      return NextResponse.json(
        {
          error: "Failed to fetch asset website",
          details:
            fetchError instanceof Error
              ? fetchError.message
              : "Network error",
        },
        { status: 502 }
      );
    }

    // 3. Extract links
    const allLinks = extractLinks(html, asset.assetDomain);
    const affiliateLinks = allLinks.filter(
      (link) => isLikelyAffiliateLink(link.url)
    );

    // 4. Load brands and active deals for this asset
    const brands = await prisma.brand.findMany({
      where: {
        status: "Active",
        OR: [
          { trackingDomain: { not: null } },
          { brandDomain: { not: null } },
        ],
      },
      select: {
        brandId: true,
        partnerId: true,
        name: true,
        brandDomain: true,
        trackingDomain: true,
      },
    });

    const activeDeals = await prisma.deal.findMany({
      where: {
        assetId,
        status: "Active",
      },
      select: {
        dealId: true,
        partnerId: true,
        brandId: true,
        affiliateLink: true,
        positionId: true,
      },
    });

    const brandInfos: BrandInfo[] = brands;
    const dealInfos: DealInfo[] = activeDeals;

    // 5. Classify each found affiliate link
    type ScanItemData = {
      type: "Verified" | "NewUnmatched" | "Missing" | "Replacement";
      foundUrl: string | null;
      foundAnchor: string | null;
      matchedDealId: string | null;
      matchedBrandId: string | null;
      confidence: number | null;
      notes: string | null;
    };

    const items: ScanItemData[] = [];
    const matchedDealIds = new Set<string>();

    for (const link of affiliateLinks) {
      const dealMatch = matchDeal(link, dealInfos);
      const brandMatch = matchBrand(link, brandInfos);

      if (dealMatch) {
        // Exact deal match = Verified
        matchedDealIds.add(dealMatch.dealId);

        // Check if brand matches but URL is different (replacement)
        if (
          dealMatch.affiliateLink &&
          normalizeDomain(link.url) !== normalizeDomain(dealMatch.affiliateLink)
        ) {
          items.push({
            type: "Replacement",
            foundUrl: link.url,
            foundAnchor: link.anchor,
            matchedDealId: dealMatch.dealId,
            matchedBrandId: brandMatch?.brand.brandId ?? null,
            confidence: brandMatch?.confidence ?? 0.8,
            notes: `URL differs from recorded affiliate link`,
          });
        } else {
          items.push({
            type: "Verified",
            foundUrl: link.url,
            foundAnchor: link.anchor,
            matchedDealId: dealMatch.dealId,
            matchedBrandId: brandMatch?.brand.brandId ?? null,
            confidence: 1.0,
            notes: null,
          });
        }
      } else if (brandMatch) {
        // Known brand but no matching deal = NewUnmatched (or Replacement if brand has deal)
        const brandDeal = dealInfos.find(
          (d) => d.brandId === brandMatch.brand.brandId
        );
        if (brandDeal) {
          matchedDealIds.add(brandDeal.dealId);
          items.push({
            type: "Replacement",
            foundUrl: link.url,
            foundAnchor: link.anchor,
            matchedDealId: brandDeal.dealId,
            matchedBrandId: brandMatch.brand.brandId,
            confidence: brandMatch.confidence,
            notes: `Brand matched but different URL than recorded deal`,
          });
        } else {
          items.push({
            type: "NewUnmatched",
            foundUrl: link.url,
            foundAnchor: link.anchor,
            matchedDealId: null,
            matchedBrandId: brandMatch.brand.brandId,
            confidence: brandMatch.confidence,
            notes: `Brand detected: ${brandMatch.brand.name}`,
          });
        }
      } else {
        // Unknown affiliate link
        items.push({
          type: "NewUnmatched",
          foundUrl: link.url,
          foundAnchor: link.anchor,
          matchedDealId: null,
          matchedBrandId: null,
          confidence: null,
          notes: "Unrecognized affiliate link",
        });
      }
    }

    // 6. Check for Missing deals — active deals whose link was NOT found
    for (const deal of dealInfos) {
      if (!matchedDealIds.has(deal.dealId)) {
        items.push({
          type: "Missing",
          foundUrl: deal.affiliateLink,
          foundAnchor: null,
          matchedDealId: deal.dealId,
          matchedBrandId: deal.brandId,
          confidence: null,
          notes: "Active deal link not found on page",
        });
      }
    }

    // 7. Store results
    const scanResult = await prisma.scanResult.create({
      data: {
        assetId,
        scannedUrl,
        totalLinks: allLinks.length,
        userId,
        items: {
          create: items,
        },
      },
      include: {
        items: {
          include: {
            matchedDeal: {
              include: {
                partner: true,
                brand: true,
                position: true,
              },
            },
            matchedBrand: {
              include: {
                partner: true,
              },
            },
          },
        },
      },
    });

    // 8. Audit
    await logAudit({
      userId,
      entity: "ScanResult",
      entityId: scanResult.scanId,
      action: "SCAN",
      details: {
        assetId,
        totalLinks: allLinks.length,
        affiliateLinks: affiliateLinks.length,
        verified: items.filter((i) => i.type === "Verified").length,
        newUnmatched: items.filter((i) => i.type === "NewUnmatched").length,
        missing: items.filter((i) => i.type === "Missing").length,
        replacements: items.filter((i) => i.type === "Replacement").length,
      },
    });

    return NextResponse.json(scanResult);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan asset" },
      { status: 500 }
    );
  }
}
