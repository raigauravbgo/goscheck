import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { scrapePage } from "@/lib/pipeline/firecrawl";
import { generateIssues } from "@/lib/pipeline/runPass2";
import PageIssueResult from "@/models/PageIssueResult";
import Scan from "@/models/Scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const MAX_CONTENT_CHARS = 5000;

type Body = { url?: string; dimension?: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params;

  if (!mongoose.isValidObjectId(scanId)) {
    return NextResponse.json({ error: "Invalid scanId" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { url, dimension } = body;
  if (!url || !dimension) {
    return NextResponse.json({ error: "url and dimension are required" }, { status: 400 });
  }
  if (!VALID_DIMENSIONS.has(dimension)) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  await connectDB();

  const scan = await Scan.findById(scanId).select("_id").lean();
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  try {
    const page = await scrapePage(url);
    const content = (page.markdown ?? "").slice(0, MAX_CONTENT_CHARS);
    if (!content) {
      return NextResponse.json({ error: "Could not extract page content" }, { status: 422 });
    }

    const issues = await generateIssues(url, dimension, content);

    const updated = await PageIssueResult.findOneAndUpdate(
      { scanId: scan._id, url, dimension },
      { scanId: scan._id, url, dimension, issues, generatedAt: new Date() },
      { upsert: true, new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Failed to persist deep-dive" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      result: {
        _id: String(updated._id),
        url: updated.url,
        dimension: updated.dimension,
        issues: updated.issues,
        generatedAt: updated.generatedAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Drill-down failed" },
      { status: 500 }
    );
  }
}
