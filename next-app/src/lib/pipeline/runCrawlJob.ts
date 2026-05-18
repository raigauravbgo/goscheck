import mongoose from "mongoose";
import pLimit from "p-limit";
import { connectDB } from "@/lib/db";
import { crawlSite } from "./firecrawl";
import { runPass1 } from "./pass1";
import { runSynthesis, type FindingSummary } from "./synthesis";
import { runPass2 } from "./runPass2";
import { fetchCWV, cwvToScore } from "@/lib/cwv";
import Scan from "@/models/Scan";
import PageResult from "@/models/PageResult";
import SiteSummary from "@/models/SiteSummary";
import type { Pass1Scores } from "@/models/PageResult";

const PASS1_CONCURRENCY = 1;

async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const is429 = msg.includes("429") || msg.includes("rate_limit");
      if (is429 && attempt < maxRetries) {
        const delay = (attempt + 1) * 15000;
        console.log(`[pipeline] Rate limited — retrying in ${delay / 1000}s`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

function severityFromScore(score: number): "good" | "needs_attention" | "critical" {
  if (score >= 70) return "good";
  if (score >= 50) return "needs_attention";
  return "critical";
}

export async function runCrawlJob(scanId: string, url: string): Promise<void> {
  await connectDB();

  console.log(`[pipeline] Scan ${scanId} starting for ${url}`);
  await Scan.findByIdAndUpdate(scanId, {
    status: "running",
    startedAt: new Date(),
    currentStage: "crawling",
    $unset: { errorReason: "", failedAtStage: "" },
  });

  let failedStage = "crawl";
  try {
    // ── Step 1: Crawl ──────────────────────────────────────────────────────
    const pages = await crawlSite(url, 200);
    if (pages.length === 0) throw new Error(`No pages returned for ${url}`);

    await Scan.findByIdAndUpdate(scanId, {
      pagesCrawled: pages.length,
      currentStage: `analyzing`,
    });

    console.log(`[pipeline] ${pages.length} pages — starting Pass 1`);
    failedStage = "pass1";

    // ── Step 2: Pass 1 ────────────────────────────────────────────────────
    const allPass1Scores: Pass1Scores[] = [];
    const limit = pLimit(PASS1_CONCURRENCY);
    let done = 0;

    await Promise.all(
      pages.map((page) =>
        limit(async () => {
          // Check if scan was cancelled before starting each page
          const currentScan = await Scan.findById(scanId, "status").lean();
          if (currentScan?.status === "failed") {
            console.log(`[pipeline] Scan ${scanId} cancelled — skipping ${page.url}`);
            return;
          }

          const pageResult = await PageResult.create({
            scanId: new mongoose.Types.ObjectId(scanId),
            url: page.url,
          });

          try {
            // Fetch CWV first so the prompt has real data, then run Pass 1
            const cwvResult = await fetchCWV(page.url).catch((err) => {
              console.warn(`[cwv] Failed for ${page.url}: ${(err as Error).message}`);
              return null;
            });

            const scores = await withRateLimitRetry(() =>
              runPass1(page.url, page.markdown, cwvResult)
            );

            // Blend CWV performance score into technical_health (50/50 with AI score)
            if (cwvResult) {
              const cwvScore = cwvToScore(cwvResult.mobile);
              const aiScore = scores.technical_health.score;
              scores.technical_health.score = Math.round((aiScore + cwvScore) / 2);
              scores.technical_health.severity =
                scores.technical_health.score >= 70 ? "good"
                : scores.technical_health.score >= 50 ? "needs_attention"
                : "critical";
            }

            await PageResult.findByIdAndUpdate(pageResult._id, {
              pass1Scores: scores,
              ...(cwvResult ? { cwvData: cwvResult } : {}),
            });
            allPass1Scores.push(scores);

            // Compute a simple overall average for the live feed
            const vals = [
              scores.seo.score,
              scores.content_quality.score,
              scores.grammar.score,
              scores.technical_health.score,
              scores.aesthetics.score,
              scores.accessibility.score,
              scores.ux_conversion.score,
              scores.brand_consistency.score,
            ];
            const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

            // Push to live progress log
            await Scan.findByIdAndUpdate(scanId, {
              $push: {
                progressLog: {
                  url: page.url,
                  overallScore: avg,
                  seo: scores.seo.score,
                  content: scores.content_quality.score,
                  grammar: scores.grammar.score,
                  technical: scores.technical_health.score,
                  severity: severityFromScore(avg),
                  completedAt: new Date(),
                },
              },
            });

            done++;
            console.log(`[pass1] ${done}/${pages.length} ${page.url} — avg:${avg}`);
          } catch (err) {
            done++;
            console.error(`[pass1] Failed for ${page.url}:`, (err as Error).message);
          }
        })
      )
    );

    // ── Step 3: Synthesis ─────────────────────────────────────────────────
    const scanBeforeSynthesis = await Scan.findById(scanId, "status").lean();
    if (scanBeforeSynthesis?.status === "failed") {
      console.log(`[pipeline] Scan ${scanId} cancelled — skipping synthesis`);
      return;
    }
    await Scan.findByIdAndUpdate(scanId, { currentStage: "synthesizing" });
    console.log(`[pipeline] Running synthesis on ${allPass1Scores.length} pages`);
    failedStage = "synthesis";

    if (allPass1Scores.length === 0) {
      throw new Error(
        "Pass 1 scored 0 of " + pages.length + " pages — every per-page LLM call failed. " +
        "Common causes: OPENAI_API_KEY missing or rate-limited, or LLM responses failing schema validation."
      );
    }

    // Build top findings context from lowest-scoring pages
    const topFindings: FindingSummary[] = allPass1Scores
      .map((s, i) => {
        const avg = Math.round(
          [s.seo.score, s.content_quality.score, s.grammar.score, s.technical_health.score].reduce((a, b) => a + b, 0) / 4
        );
        return { avg, scores: s };
      })
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5)
      .map(({ scores }) => ({
        title: `Low scores detected`,
        dimension: "seo",
        impactStatement: `SEO: ${scores.seo.score}, Content: ${scores.content_quality.score}, Technical: ${scores.technical_health.score}`,
        effortLevel: "moderate",
      }));

    const synthesis = await runSynthesis(url, allPass1Scores, topFindings);

    await SiteSummary.deleteOne({ scanId: new mongoose.Types.ObjectId(scanId) });
    await SiteSummary.create({
      scanId: new mongoose.Types.ObjectId(scanId),
      overallScore: synthesis.overallScore,
      grade: synthesis.grade,
      aiNarrative: synthesis.aiNarrative,
      topFindings: [],
      dimensionScores: synthesis.dimensionScores,
    });

    // ── Step 4: Complete ──────────────────────────────────────────────────
    await Scan.findByIdAndUpdate(scanId, {
      status: "complete",
      completedAt: new Date(),
      currentStage: "complete",
    });

    console.log(`[pipeline] Scan ${scanId} complete — score: ${synthesis.overallScore} (${synthesis.grade})`);

    // ── Step 5: Pass 2 (background, fire-and-forget) ──────────────────────
    void runPass2(scanId);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    await Scan.findByIdAndUpdate(scanId, {
      status: "failed",
      completedAt: new Date(),
      currentStage: "failed",
      errorReason: message.slice(0, 1000),
      failedAtStage: failedStage,
    });
    console.error(`[pipeline] Scan ${scanId} failed at ${failedStage}:`, message);
  }
}
