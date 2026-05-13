import OpenAI from "openai";
import type { Grade, IDimensionAggregate } from "@/models/SiteSummary";
import type { Pass1Scores } from "@/models/PageResult";

const MODEL = "gpt-4.1";

const DIMENSION_WEIGHTS: Record<string, number> = {
  seo: 0.20, content_quality: 0.20, grammar: 0.15, technical_health: 0.15,
  aesthetics: 0.10, accessibility: 0.10, ux_conversion: 0.05, brand_consistency: 0.05,
};

const DIMENSION_LABELS: Record<string, string> = {
  seo: "Search Engine Visibility", content_quality: "Message Strength",
  grammar: "Writing Quality", aesthetics: "Visual Clarity",
  technical_health: "Site Reliability", accessibility: "Inclusivity & Reach",
  ux_conversion: "Ease of Action", brand_consistency: "Brand Coherence",
};

export interface SynthesisResult {
  overallScore: number;
  grade: Grade;
  aiNarrative: string;
  dimensionScores: Record<string, IDimensionAggregate>;
}

export interface FindingSummary {
  title: string;
  dimension: string;
  impactStatement: string;
  effortLevel: string;
}

function scoreToGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function aggregateDimensionScores(allPageScores: Pass1Scores[]): Record<string, IDimensionAggregate> {
  const result: Record<string, IDimensionAggregate> = {};
  for (const dim of Object.keys(DIMENSION_WEIGHTS)) {
    const scores = allPageScores
      .map((p) => (p as unknown as Record<string, { score: number }>)[dim]?.score)
      .filter((s): s is number => typeof s === "number");
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    result[dim] = { score: avg, weight: DIMENSION_WEIGHTS[dim] };
  }
  return result;
}

export function computeOverallScore(dimensionScores: Record<string, IDimensionAggregate>): number {
  let weighted = 0;
  for (const { score, weight } of Object.values(dimensionScores)) {
    weighted += score * weight;
  }
  return Math.round(weighted);
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

export async function runSynthesis(
  siteUrl: string,
  allPageScores: Pass1Scores[],
  topFindings: FindingSummary[]
): Promise<SynthesisResult> {
  const dimensionScores = aggregateDimensionScores(allPageScores);
  const overallScore = computeOverallScore(dimensionScores);
  const grade = scoreToGrade(overallScore);

  const dimensionSummary = Object.entries(dimensionScores)
    .sort(([, a], [, b]) => a.score - b.score)
    .map(([dim, { score }]) => `- ${DIMENSION_LABELS[dim] ?? dim}: ${score}/100`)
    .join("\n");

  const findingsSummary = topFindings
    .slice(0, 5)
    .map((f) => `- [${f.dimension}] ${f.title}: ${f.impactStatement}`)
    .join("\n");

  const prompt = `You are a senior digital consultant writing an executive summary for a website audit report.

Write a concise 3–5 sentence narrative summarizing the overall health of this website. Use consultant-level language — confident, plain, and business-focused. Do not use bullet points. Do not repeat the score numbers verbatim — reference them naturally.

Website: ${siteUrl}
Overall Score: ${overallScore}/100 (Grade: ${grade})

Dimension Scores (lowest to highest):
${dimensionSummary}

Key Issues Found:
${findingsSummary || "No critical issues flagged."}

Write the narrative now. It should read like a senior consultant's opening paragraph in a boardroom presentation.`;

  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const aiNarrative = response.choices[0]?.message?.content?.trim() ?? "";

  return { overallScore, grade, aiNarrative, dimensionScores };
}
