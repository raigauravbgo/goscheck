import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Scan from "@/models/Scan";
import Site from "@/models/Site";
import PageResult from "@/models/PageResult";
import SiteSummary from "@/models/SiteSummary";
import Finding from "@/models/Finding";
import PageIssueResult from "@/models/PageIssueResult";
import { runCrawlJob } from "@/lib/pipeline/runCrawlJob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params;
  if (!mongoose.isValidObjectId(scanId)) {
    return NextResponse.json({ error: "Invalid scanId" }, { status: 400 });
  }

  await connectDB();

  const scan = await Scan.findById(scanId);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  if (scan.status === "running" || scan.status === "pending") {
    return NextResponse.json({ error: "Scan is already in progress" }, { status: 409 });
  }

  const site = await Site.findById(scan.siteId).lean();
  if (!site) return NextResponse.json({ error: "Site not found for this scan" }, { status: 500 });

  const url = "https://" + site.domain;

  await Promise.all([
    PageResult.deleteMany({ scanId: scan._id }),
    PageIssueResult.deleteMany({ scanId: scan._id }),
    Finding.deleteMany({ scanId: scan._id }),
    SiteSummary.deleteOne({ scanId: scan._id }),
  ]);

  await Scan.findByIdAndUpdate(scan._id, {
    status: "pending",
    currentStage: "queued",
    pagesCrawled: 0,
    progressLog: [],
    pass2Status: "pending",
    $unset: {
      errorReason: "",
      failedAtStage: "",
      completedAt: "",
      startedAt: "",
      pass2StartedAt: "",
      pass2CompletedAt: "",
    },
  });

  void runCrawlJob(String(scan._id), url).catch((err) => {
    console.error(`[scan ${scan._id}] resume runCrawlJob failed:`, (err as Error).message);
  });

  return NextResponse.json({ ok: true, scanId: String(scan._id), url });
}
