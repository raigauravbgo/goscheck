import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Scan from "@/models/Scan";
import Site from "@/models/Site";
import SiteSummary from "@/models/SiteSummary";
import Finding from "@/models/Finding";
import PageResult from "@/models/PageResult";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;

  if (!mongoose.isValidObjectId(scanId)) {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 });
  }

  await connectDB();

  const scan = await Scan.findById(scanId).lean();
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  const [site, summary, findings, pageResults] = await Promise.all([
    Site.findById(scan.siteId).lean(),
    SiteSummary.findOne({ scanId: scan._id }).lean(),
    Finding.find({ scanId: scan._id }).sort({ createdAt: 1 }).lean(),
    PageResult.find({ scanId: scan._id }).select("url pass1Scores").lean(),
  ]);

  return NextResponse.json({
    scan: { ...scan, _id: String(scan._id) },
    site: site ? { ...site, _id: String(site._id) } : null,
    summary: summary ? { ...summary, _id: String(summary._id) } : null,
    findings: findings.map((f) => ({ ...f, _id: String(f._id) })),
    pageResults: pageResults.map((p) => ({ ...p, _id: String(p._id) })),
  });
}
