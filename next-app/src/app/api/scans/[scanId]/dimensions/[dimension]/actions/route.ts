import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "AI actions are not wired up in this build. The endpoint scaffold exists at /api/scans/[scanId]/dimensions/[dimension]/actions but the OpenAI integration that generates blog posts, meta descriptions, etc. has not been restored.",
    },
    { status: 501 }
  );
}
