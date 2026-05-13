import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Site from "@/models/Site";
import Scan from "@/models/Scan";
import SiteSummary from "@/models/SiteSummary";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const decoded = decodeURIComponent(domain);

  await connectDB();

  const site = await Site.findOne({ domain: decoded }).lean();
  if (!site) {
    return NextResponse.json({ history: [] });
  }

  const scans = await Scan.find({ siteId: site._id, status: { $ne: "failed" } })
    .sort({ createdAt: -1 })
    .lean();

  const summaries = await SiteSummary.find({ scanId: { $in: scans.map((s) => s._id) } }).lean();
  const summaryByScan = new Map(summaries.map((s) => [String(s.scanId), s]));

  const history = scans.map((scan) => ({
    scan: { ...scan, _id: String(scan._id) },
    summary: (() => {
      const s = summaryByScan.get(String(scan._id));
      return s ? { ...s, _id: String(s._id) } : null;
    })(),
  }));

  return NextResponse.json({ history });
}
