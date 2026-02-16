import { normalizeDomain } from "./utils";

export interface ExtractedLink {
  url: string;
  anchor: string;
  domain: string;
}

export interface BrandInfo {
  brandId: string;
  partnerId: string;
  name: string;
  brandDomain: string | null;
}

export interface DealInfo {
  dealId: string;
  partnerId: string;
  brandId: string;
  affiliateLink: string | null;
  trackingDomain: string | null;
  positionId: string;
}

export interface BrandMatch {
  brand: BrandInfo;
  confidence: number;
}

const AFFILIATE_PATTERNS = [
  /track\./i,
  /click\./i,
  /go\./i,
  /redirect\./i,
  /redir\./i,
  /aff\./i,
  /affiliate/i,
  /[?&]btag=/i,
  /[?&]stag=/i,
  /[?&]ref=/i,
  /[?&]affid=/i,
  /[?&]aff_id=/i,
  /[?&]clickid=/i,
  /[?&]click_id=/i,
  /[?&]tracker=/i,
  /[?&]campaign=/i,
  /[?&]source=/i,
  /[?&]utm_/i,
  /[?&]pid=/i,
  /[?&]mid=/i,
  /[?&]sid=/i,
  /partners\./i,
  /tracking\./i,
  /offer/i,
  /promo/i,
];

/**
 * Extract all external links from HTML, dedup by URL.
 */
export function extractLinks(html: string, assetDomain: string): ExtractedLink[] {
  const normalizedAsset = normalizeDomain(assetDomain);
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const links: ExtractedLink[] = [];

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const anchor = match[2].replace(/<[^>]*>/g, "").trim();

    // Skip non-http links, anchors, javascript, mailto
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("//")
    ) {
      continue;
    }

    const fullUrl = url.startsWith("//") ? `https:${url}` : url;

    // Extract domain
    let domain: string;
    try {
      domain = normalizeDomain(new URL(fullUrl).hostname);
    } catch {
      continue;
    }

    // Skip internal links
    if (domain === normalizedAsset || domain.endsWith(`.${normalizedAsset}`)) {
      continue;
    }

    // Dedup
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);

    links.push({ url: fullUrl, anchor, domain });
  }

  return links;
}

/**
 * Check if a URL looks like an affiliate/tracking link.
 */
export function isLikelyAffiliateLink(url: string): boolean {
  return AFFILIATE_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Match a link against known brands by tracking domain and brand domain.
 */
export function matchBrand(link: ExtractedLink, brands: BrandInfo[]): BrandMatch | null {
  let bestMatch: BrandMatch | null = null;

  for (const brand of brands) {
    // Check brand domain
    if (brand.brandDomain) {
      const normalizedBrand = normalizeDomain(brand.brandDomain);
      if (
        link.domain === normalizedBrand ||
        link.domain.endsWith(`.${normalizedBrand}`)
      ) {
        const confidence = 0.7;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { brand, confidence };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Match a link against known deals by affiliate link URL.
 */
export function matchDeal(
  link: ExtractedLink,
  deals: DealInfo[]
): DealInfo | null {
  // Check trackingDomain first
  for (const deal of deals) {
    if (!deal.trackingDomain) continue;
    const normalizedTracking = normalizeDomain(deal.trackingDomain);
    if (
      link.domain === normalizedTracking ||
      link.domain.endsWith(`.${normalizedTracking}`)
    ) {
      return deal;
    }
  }

  for (const deal of deals) {
    if (!deal.affiliateLink) continue;

    // Exact match
    if (link.url === deal.affiliateLink) return deal;

    // Normalized comparison (strip trailing slashes, compare)
    const normalizedLink = link.url.replace(/\/+$/, "").toLowerCase();
    const normalizedDeal = deal.affiliateLink.replace(/\/+$/, "").toLowerCase();
    if (normalizedLink === normalizedDeal) return deal;

    // Domain + path match (ignore query params)
    try {
      const linkUrl = new URL(link.url);
      const dealUrl = new URL(deal.affiliateLink);
      if (
        linkUrl.hostname === dealUrl.hostname &&
        linkUrl.pathname === dealUrl.pathname
      ) {
        return deal;
      }
    } catch {
      // skip malformed URLs
    }
  }

  return null;
}
