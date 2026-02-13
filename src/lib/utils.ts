import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

const COMPANY_SUFFIXES =
  /\s*(inc\.?|ltd\.?|llc\.?|corp\.?|corporation|gmbh|plc\.?|co\.?|company|limited|incorporated|ag|sa|s\.?a\.?|s\.?r\.?l\.?|pty\.?|b\.?v\.?|n\.?v\.?)$/i;

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(COMPANY_SUFFIXES, "")
    .replace(/[.,\-_]+$/, "")
    .trim();
}
