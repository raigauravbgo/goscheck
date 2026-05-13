export interface CWVData {
  lcp: number | null;        // Largest Contentful Paint (ms)
  inp: number | null;        // Interaction to Next Paint (ms)
  cls: number | null;        // Cumulative Layout Shift (unitless)
  fcp: number | null;        // First Contentful Paint (ms)
  ttfb: number | null;       // Time to First Byte (ms)
  performanceScore: number | null;  // Lighthouse 0–100
  strategy: "mobile" | "desktop";
  fetchedAt: Date;
}

export interface CWVResult {
  mobile: CWVData;
  desktop: CWVData;
}

type PSICategory = { score: number | null };
type PSIAudit = { numericValue?: number; displayValue?: string };
type PSIResponse = {
  lighthouseResult?: {
    categories?: { performance?: PSICategory };
    audits?: {
      "largest-contentful-paint"?: PSIAudit;
      "interaction-to-next-paint"?: PSIAudit;
      "cumulative-layout-shift"?: PSIAudit;
      "first-contentful-paint"?: PSIAudit;
      "server-response-time"?: PSIAudit;
    };
  };
};

async function fetchPSI(url: string, strategy: "mobile" | "desktop"): Promise<CWVData> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PAGESPEED_API_KEY is not set");

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", apiKey);
  // Only fetch performance category to minimise response size
  endpoint.searchParams.set("category", "performance");

  const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PageSpeed API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as PSIResponse;
  const lr = data.lighthouseResult;
  const audits = lr?.audits ?? {};
  const perfScore = lr?.categories?.performance?.score;

  return {
    lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
    inp: audits["interaction-to-next-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    fcp: audits["first-contentful-paint"]?.numericValue ?? null,
    ttfb: audits["server-response-time"]?.numericValue ?? null,
    performanceScore: perfScore != null ? Math.round(perfScore * 100) : null,
    strategy,
    fetchedAt: new Date(),
  };
}

export async function fetchCWV(url: string): Promise<CWVResult> {
  // Fetch mobile and desktop in parallel
  const [mobile, desktop] = await Promise.all([
    fetchPSI(url, "mobile"),
    fetchPSI(url, "desktop"),
  ]);
  return { mobile, desktop };
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

export type CWVRating = "good" | "needs_improvement" | "poor";

export function rateLCP(ms: number | null): CWVRating {
  if (ms === null) return "poor";
  if (ms <= 2500) return "good";
  if (ms <= 4000) return "needs_improvement";
  return "poor";
}

export function rateINP(ms: number | null): CWVRating {
  if (ms === null) return "poor";
  if (ms <= 200) return "good";
  if (ms <= 500) return "needs_improvement";
  return "poor";
}

export function rateCLS(value: number | null): CWVRating {
  if (value === null) return "poor";
  if (value <= 0.1) return "good";
  if (value <= 0.25) return "needs_improvement";
  return "poor";
}

export function rateFCP(ms: number | null): CWVRating {
  if (ms === null) return "poor";
  if (ms <= 1800) return "good";
  if (ms <= 3000) return "needs_improvement";
  return "poor";
}

/** Convert a CWVData object to a 0–100 score for the technical_health dimension */
export function cwvToScore(cwv: CWVData): number {
  if (cwv.performanceScore !== null) return cwv.performanceScore;

  // Fallback: derive from individual metrics
  const ratings = [rateLCP(cwv.lcp), rateINP(cwv.inp), rateCLS(cwv.cls), rateFCP(cwv.fcp)];
  const points = ratings.reduce((sum, r) => sum + (r === "good" ? 100 : r === "needs_improvement" ? 60 : 20), 0);
  return Math.round(points / ratings.length);
}

/** Format a millisecond value for display */
export function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/** Format CLS value */
export function fmtCLS(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(3);
}
