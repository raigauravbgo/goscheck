import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Scan from "@/models/Scan";
import Site from "@/models/Site";
import SiteSummary from "@/models/SiteSummary";
import { runCrawlJob } from "@/lib/pipeline/runCrawlJob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PostBody = { url?: string; compareUrl?: string };

function normalizeUrl(input: string): { url: string; domain: string } | null {
  try {
    const trimmed = input.trim();
    const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    return { url: u.origin + u.pathname.replace(/\/$/, ""), domain: u.hostname };
  } catch {
    return null;
  }
}

async function startScan(rawUrl: string): Promise<{ scanId: string } | { error: string; status: number }> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return { error: "Invalid URL", status: 400 };

  const { url, domain } = normalized;

  await connectDB();

  let site = await Site.findOne({ domain });
  if (!site) {
    site = await Site.create({ domain, name: domain });
  }

  const scan = await Scan.create({
    siteId: site._id,
    triggeredBy: "manual",
    status: "pending",
    currentStage: "queued",
  });

  void runCrawlJob(String(scan._id), url).catch((err) => {
    console.error(`[scan ${scan._id}] runCrawlJob failed:`, (err as Error).message);
    Scan.findByIdAndUpdate(scan._id, { status: "failed", currentStage: "failed" }).catch(() => {});
  });

  return { scanId: String(scan._id) };
}

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const primary = await startScan(body.url);
  if ("error" in primary) {
    return NextResponse.json({ error: primary.error }, { status: primary.status });
  }

  let comparisonScanId: string | undefined;
  if (body.compareUrl) {
    const compare = await startScan(body.compareUrl);
    if ("error" in compare) {
      return NextResponse.json({ error: `Compare URL: ${compare.error}` }, { status: compare.status });
    }
    comparisonScanId = compare.scanId;
    await Scan.findByIdAndUpdate(primary.scanId, {
      compareUrl: body.compareUrl,
      comparisonScanId,
    });
  }

  return NextResponse.json({ scanId: primary.scanId, comparisonScanId });
}

export async function GET() {
  await connectDB();

  const scans = await Scan.find({ status: { $ne: "failed" } })
    .sort({ createdAt: -1 })
    .lean();

  const siteIds = [...new Set(scans.map((s) => String(s.siteId)))];
  const scanIds = scans.map((s) => s._id);

  const [sites, summaries] = await Promise.all([
    Site.find({ _id: { $in: siteIds } }).lean(),
    SiteSummary.find({ scanId: { $in: scanIds } }).lean(),
  ]);

  const siteById = new Map(sites.map((s) => [String(s._id), s]));
  const summaryByScan = new Map(summaries.map((s) => [String(s.scanId), s]));

  const rows = scans.map((s) => {
    const site = siteById.get(String(s.siteId));
    const summary = summaryByScan.get(String(s._id));
    return {
      _id: String(s._id),
      domain: site?.domain ?? null,
      status: s.status,
      overallScore: summary?.overallScore ?? null,
      grade: summary?.grade ?? null,
      pagesCrawled: s.pagesCrawled ?? 0,
      createdAt: s.createdAt,
      completedAt: s.completedAt ?? null,
    };
  });

  return NextResponse.json(rows);
}
