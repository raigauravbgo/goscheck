import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackerPush from "@/models/TrackerPush";

export const dynamic = "force-dynamic";

type PushBody = {
  scanId?: string;
  url?: string;
  dimension?: string;
  issueTitle?: string;
  trackerType?: "linear" | "jira";
};

export async function POST(req: Request) {
  let body: PushBody;
  try {
    body = (await req.json()) as PushBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { scanId, url, dimension, issueTitle, trackerType = "jira" } = body;

  if (!scanId || !url || !dimension || !issueTitle) {
    return NextResponse.json(
      { error: "scanId, url, dimension, and issueTitle are required" },
      { status: 400 }
    );
  }
  if (!mongoose.isValidObjectId(scanId)) {
    return NextResponse.json({ error: "Invalid scanId" }, { status: 400 });
  }
  if (trackerType !== "linear" && trackerType !== "jira") {
    return NextResponse.json({ error: "trackerType must be 'linear' or 'jira'" }, { status: 400 });
  }

  await connectDB();

  const existing = await TrackerPush.findOne({
    scanId,
    url,
    dimension,
    issueTitle,
    trackerType,
  }).lean();
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyPushed: true,
      ticketId: existing.ticketId,
      ticketUrl: existing.ticketUrl,
      pushedAt: existing.pushedAt,
    });
  }

  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const ticketId = trackerType === "jira" ? `GOSC-${ticketNumber}` : `GOS-${ticketNumber}`;
  const ticketUrl =
    trackerType === "jira"
      ? `https://example.atlassian.net/browse/${ticketId}`
      : `https://linear.app/example/issue/${ticketId}`;

  const doc = await TrackerPush.create({
    scanId,
    url,
    dimension,
    issueTitle,
    trackerType,
    ticketId,
    ticketUrl,
  });

  return NextResponse.json({
    ok: true,
    alreadyPushed: false,
    ticketId: doc.ticketId,
    ticketUrl: doc.ticketUrl,
    pushedAt: doc.pushedAt,
  });
}
