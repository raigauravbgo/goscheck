import OpenAI from "openai";
import type { Pass1Scores, DimensionScore, Severity } from "@/models/PageResult";
import type { CWVResult } from "@/lib/cwv";
import { fmtMs, fmtCLS, rateLCP, rateINP, rateCLS, rateFCP } from "@/lib/cwv";

const MODEL = "gpt-4.1";
const MAX_CONTENT_CHARS = 4000;

const DIMENSIONS = [
  "seo", "content_quality", "grammar", "aesthetics",
  "technical_health", "accessibility", "ux_conversion", "brand_consistency",
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  seo: "SEO / Search Engine Visibility",
  content_quality: "Content Quality / Message Strength",
  grammar: "Grammar & Writing Quality",
  aesthetics: "Aesthetics / Visual Clarity",
  technical_health: "Technical Health / Site Reliability",
  accessibility: "Accessibility / Inclusivity & Reach",
  ux_conversion: "UX & Conversion / Ease of Action",
  brand_consistency: "Brand Consistency / Brand Coherence",
};

function severityFromScore(score: number): Severity {
  if (score < 50) return "critical";
  if (score < 70) return "needs_attention";
  return "good";
}

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

const scoreTool: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "score_page",
    description: "Score a webpage across 8 quality dimensions based on the provided content.",
    parameters: {
      type: "object",
      required: DIMENSIONS as unknown as string[],
      properties: Object.fromEntries(
        DIMENSIONS.map((dim) => [
          dim,
          {
            type: "object",
            required: ["score", "confidence"],
            properties: {
              score: { type: "number", description: "Score from 0–100." },
              confidence: { type: "number", description: "Confidence 0.0–1.0." },
            },
          },
        ])
      ),
    },
  },
};

export async function runPass1(pageUrl: string, markdown: string, cwv?: CWVResult | null): Promise<Pass1Scores> {
  const client = getClient();
  const content = markdown.slice(0, MAX_CONTENT_CHARS);

  const dimensionList = DIMENSIONS.map((d) => `- ${d}: ${DIMENSION_LABELS[d]}`).join("\n");

  // Build CWV context block if available
  let cwvContext = "";
  if (cwv) {
    const m = cwv.mobile;
    const d = cwv.desktop;
    cwvContext = `
Real performance data (from Google PageSpeed Insights):
Mobile  — LCP: ${fmtMs(m.lcp)} (${rateLCP(m.lcp)}), INP: ${fmtMs(m.inp)} (${rateINP(m.inp)}), CLS: ${fmtCLS(m.cls)} (${rateCLS(m.cls)}), FCP: ${fmtMs(m.fcp)} (${rateFCP(m.fcp)}), Perf score: ${m.performanceScore ?? "—"}/100
Desktop — LCP: ${fmtMs(d.lcp)} (${rateLCP(d.lcp)}), INP: ${fmtMs(d.inp)} (${rateINP(d.inp)}), CLS: ${fmtCLS(d.cls)} (${rateCLS(d.cls)}), FCP: ${fmtMs(d.fcp)} (${rateFCP(d.fcp)}), Perf score: ${d.performanceScore ?? "—"}/100

Use this real data to score the technical_health dimension accurately. Do not infer performance from content — use the numbers above.`;
  }

  const prompt = `You are a senior digital consultant performing a rapid triage audit of a webpage.

Analyze the following webpage content and score it across these 8 dimensions:
${dimensionList}

Scoring guide:
- 90–100: Excellent — industry-leading quality
- 70–89: Good — meets standards with minor gaps
- 50–69: Needs Attention — clear issues affecting performance
- 0–49: Critical — significant problems requiring immediate action

Be realistic and critical. Most pages will have areas below 70.
${cwvContext}
Page URL: ${pageUrl}

Page content:
---
${content}
---

Score each dimension objectively based only on what you can observe in the content above.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [scoreTool],
    tool_choice: { type: "function", function: { name: "score_page" } },
    messages: [{ role: "user", content: prompt }],
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("Pass 1: OpenAI did not return a function call");
  }

  const raw = JSON.parse(toolCall.function.arguments) as Record<string, { score: number; confidence: number }>;
  const scores: Pass1Scores = {} as Pass1Scores;

  for (const dim of DIMENSIONS) {
    const { score, confidence } = raw[dim];
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    scores[dim] = {
      score: clamped,
      severity: severityFromScore(clamped),
      confidence: Math.max(0, Math.min(1, confidence)),
    } satisfies DimensionScore;
  }

  return scores;
}
