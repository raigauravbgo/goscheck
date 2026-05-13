import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Scan from "@/models/Scan";
import SiteSummary from "@/models/SiteSummary";
import PageResult from "@/models/PageResult";
import PageIssueResult from "@/models/PageIssueResult";
import Finding from "@/models/Finding";
import TrackerPush from "@/models/TrackerPush";

export const dynamic = "force-dynamic";

const VALID_DIMENSIONS = new Set([
  "seo",
  "content_quality",
  "grammar",
  "aesthetics",
  "technical_health",
  "accessibility",
  "ux_conversion",
  "brand_consistency",
]);

type Severity = "good" | "needs_attention" | "critical";

function severityFromScore(score: number): Severity {
  if (score >= 70) return "good";
  if (score >= 50) return "needs_attention";
  return "critical";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanId: string; dimension: string }> }
) {
  const { scanId, dimension } = await params;

  if (!mongoose.isValidObjectId(scanId)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 });
  }
  if (!VALID_DIMENSIONS.has(dimension)) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  await connectDB();

  const scan = await Scan.findById(scanId).lean();
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  const [summary, pageResults, siblingScans] = await Promise.all([
    SiteSummary.findOne({ scanId: scan._id }).lean(),
    PageResult.find({ scanId: scan._id }).lean(),
    Scan.find({ siteId: scan.siteId }).select("_id").lean(),
  ]);

  const siblingScanIds = siblingScans.map((s) => s._id);

  const [findings, l2Issues, trackerPushes] = await Promise.all([
    Finding.find({ scanId: { $in: siblingScanIds }, dimension })
      .sort({ aiConfidence: -1, createdAt: 1 })
      .lean(),
    PageIssueResult.find({ scanId: { $in: siblingScanIds }, dimension }).lean(),
    TrackerPush.find({ scanId: { $in: siblingScanIds }, dimension }).lean(),
  ]);

  const findingPageIds = [...new Set(findings.map((f) => String(f.pageResultId)).filter(Boolean))];
  const findingPages = findingPageIds.length
    ? await PageResult.find({ _id: { $in: findingPageIds } }).select("url").lean()
    : [];
  const urlByPageId = new Map(findingPages.map((p) => [String(p._id), p.url]));

  const pageBreakdown = pageResults
    .map((p) => {
      const dimScore = p.pass1Scores?.[dimension as keyof typeof p.pass1Scores];
      if (!dimScore) return null;
      return {
        url: p.url,
        score: dimScore.score,
        severity: dimScore.severity ?? severityFromScore(dimScore.score),
        confidence: dimScore.confidence ?? 0,
      };
    })
    .filter((p): p is { url: string; score: number; severity: Severity; confidence: number } => p !== null)
    .sort((a, b) => a.score - b.score);

  const worstPages = pageBreakdown.slice(0, 5);
  const bestPages = [...pageBreakdown].sort((a, b) => b.score - a.score).slice(0, 3);

  const dimAggregate = summary?.dimensionScores?.[dimension];

  return NextResponse.json({
    dimension,
    aggregateScore: dimAggregate?.score ?? null,
    weight: dimAggregate?.weight ?? null,
    pageBreakdown,
    worstPages,
    bestPages,
    totalPages: pageBreakdown.length,
    findings: findings.map((f) => ({
      ...f,
      _id: String(f._id),
      pageUrl: urlByPageId.get(String(f.pageResultId)) ?? null,
    })),
    l2Issues: l2Issues.map((p) => ({
      _id: String(p._id),
      url: p.url,
      generatedAt: p.generatedAt,
      issues: p.issues,
    })),
    trackerPushes: trackerPushes.map((t) => ({
      _id: String(t._id),
      url: t.url,
      issueTitle: t.issueTitle,
      trackerType: t.trackerType,
      ticketId: t.ticketId,
      ticketUrl: t.ticketUrl,
      pushedAt: t.pushedAt,
    })),
  });
}
