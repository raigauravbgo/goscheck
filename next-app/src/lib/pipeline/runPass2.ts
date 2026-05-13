import OpenAI from "openai";
import pLimit from "p-limit";
import { connectDB } from "@/lib/db";
import { scrapePage } from "./firecrawl";
import Scan from "@/models/Scan";
import PageResult from "@/models/PageResult";
import PageIssueResult from "@/models/PageIssueResult";
import type { PageIssue } from "@/models/PageIssueResult";

const MODEL = "gpt-4.1";
const MAX_CONTENT_CHARS = 5000;
const PASS2_CONCURRENCY = 2;
const SCORE_THRESHOLD = 70;

const DIMENSION_FOCUS: Record<string, string> = {
  seo: `Focus on: missing or weak meta title/description, missing canonical tags, heading hierarchy (H1/H2), lack of structured data/schema markup, thin content, keyword absence, missing alt text on images, poor URL structure, missing Open Graph tags.`,
  content_quality: `Focus on: weak or missing value proposition, vague messaging, no clear target audience, shallow content depth, missing social proof, overuse of jargon, lack of calls to action, poor storytelling, no unique angle.`,
  grammar: `Focus on: spelling errors, grammatical mistakes, passive voice overuse, run-on sentences, inconsistent tense, unprofessional phrasing, poor readability, overly complex sentences, punctuation errors.`,
  aesthetics: `Focus on: visual hierarchy problems, poor typography choices, inconsistent spacing, color contrast issues, cluttered layouts, missing whitespace, unbalanced compositions, low-quality images, poor mobile layout signals from content structure.`,
  technical_health: `Focus on: broken links or references, missing HTTPS indicators, slow-loading signals (large images referenced, render-blocking resources), missing error handling, outdated libraries referenced, security header gaps, poor page structure for crawlability.`,
  accessibility: `Focus on: missing alt text, no ARIA labels, poor heading structure, color contrast issues in text, missing form labels, keyboard navigation blockers, missing language attribute, no skip navigation, reliance on color alone to convey information.`,
  ux_conversion: `Focus on: weak or missing CTAs, confusing navigation, too many choices (decision paralysis), no urgency or trust signals, poor form design, friction in conversion path, missing contact info, unclear next steps, no social proof near conversion points.`,
  brand_consistency: `Focus on: inconsistent tone of voice, mixed messaging, off-brand terminology, mismatched visual language described in content, conflicting value propositions across sections, unprofessional language, brand promise not delivered in content.`,
};

const DIMENSION_KEYS = [
  "seo", "content_quality", "grammar", "aesthetics",
  "technical_health", "accessibility", "ux_conversion", "brand_consistency",
] as const;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

export async function generateIssues(url: string, dimension: string, content: string): Promise<PageIssue[]> {
  const focus = DIMENSION_FOCUS[dimension] ?? "Identify quality issues on this page.";
  const prompt = `You are a senior digital consultant doing a detailed audit of a specific webpage.

Your job is to identify SPECIFIC, CONCRETE issues for the "${dimension}" dimension of this page. Do NOT give generic advice — every issue must reference actual content, elements, or patterns found on this page.

${focus}

For each issue you find, return a JSON object with:
- title: short issue name (e.g. "Missing meta description", "H1 tag absent", "CTA button text is vague")
- description: 1-2 sentences explaining exactly what is wrong and where on the page
- severity: "critical" | "moderate" | "minor"
- location: where on the page this issue is (e.g. "Page <head>", "Hero section", "Navigation bar", "Footer")
- suggestedFix: a specific, actionable fix (1-2 sentences)

Return a JSON array of issues. Find between 3 and 8 real issues. Only report issues you can actually see evidence of in the content below.

Page URL: ${url}

Page content:
---
${content}
---

Return ONLY a valid JSON object with an "issues" key containing the array. No markdown fences.`;

  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a website auditor. Always respond with valid JSON containing an 'issues' array.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { issues?: PageIssue[] };
  return parsed.issues ?? [];
}

export async function runPass2(scanId: string): Promise<void> {
  await connectDB();

  console.log(`[pass2] Starting for scan ${scanId}`);
  await Scan.findByIdAndUpdate(scanId, {
    pass2Status: "running",
    pass2StartedAt: new Date(),
  });

  try {
    const pages = await PageResult.find({ scanId }).lean();

    // Build list of (url, dimension) pairs that need deep analysis
    type WorkItem = { url: string; dimension: string };
    const workItems: WorkItem[] = [];

    for (const page of pages) {
      if (!page.pass1Scores) continue;
      for (const dim of DIMENSION_KEYS) {
        const score = page.pass1Scores[dim]?.score;
        if (score !== undefined && score < SCORE_THRESHOLD) {
          // Skip if already in DB
          const existing = await PageIssueResult.exists({
            scanId: page.scanId,
            url: page.url,
            dimension: dim,
          });
          if (!existing) {
            workItems.push({ url: page.url, dimension: dim });
          }
        }
      }
    }

    console.log(`[pass2] ${workItems.length} page/dimension combos to analyze`);

    if (workItems.length === 0) {
      await Scan.findByIdAndUpdate(scanId, {
        pass2Status: "skipped",
        pass2CompletedAt: new Date(),
      });
      return;
    }

    const limit = pLimit(PASS2_CONCURRENCY);
    let done = 0;

    await Promise.all(
      workItems.map((item) =>
        limit(async () => {
          // Check if scan was cancelled
          const currentScan = await Scan.findById(scanId, "status").lean();
          if (currentScan?.status === "failed") {
            console.log(`[pass2] Scan ${scanId} cancelled — stopping`);
            return;
          }

          try {
            const page = await scrapePage(item.url);
            const content = page.markdown.slice(0, MAX_CONTENT_CHARS);
            const issues = await generateIssues(item.url, item.dimension, content);

            await PageIssueResult.findOneAndUpdate(
              { scanId, url: item.url, dimension: item.dimension },
              { scanId, url: item.url, dimension: item.dimension, issues, generatedAt: new Date() },
              { upsert: true }
            );

            done++;
            console.log(`[pass2] ${done}/${workItems.length} — ${item.url} [${item.dimension}] — ${issues.length} issues`);
          } catch (err) {
            done++;
            console.error(`[pass2] Failed ${item.url} [${item.dimension}]:`, (err as Error).message);
          }
        })
      )
    );

    await Scan.findByIdAndUpdate(scanId, {
      pass2Status: "complete",
      pass2CompletedAt: new Date(),
    });

    console.log(`[pass2] Scan ${scanId} complete — ${done} items processed`);
  } catch (err) {
    console.error(`[pass2] Scan ${scanId} failed:`, (err as Error).message);
    await Scan.findByIdAndUpdate(scanId, { pass2Status: "skipped" });
  }
}
