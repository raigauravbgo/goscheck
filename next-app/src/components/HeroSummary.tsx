"use client";

import type { IScan } from "@/models/Scan";
import type { ISiteSummary } from "@/models/SiteSummary";

function gradeColor(grade: string) {
  if (grade === "A") return { text: "var(--good)", glow: "rgba(34,197,94,0.3)" };
  if (grade === "B") return { text: "#3b82f6", glow: "rgba(59,130,246,0.3)" };
  if (grade === "C") return { text: "var(--attention)", glow: "rgba(234,179,8,0.3)" };
  return { text: "var(--critical)", glow: "rgba(239,68,68,0.3)" };
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--attention)";
  return "var(--critical)";
}

type Props = {
  scan: IScan & { _id: string };
  summary: (ISiteSummary & { _id: string }) | null;
  siteUrl?: string;
};

export default function HeroSummary({ scan, summary, siteUrl }: Props) {
  const grade = summary?.grade ?? "—";
  const colors = gradeColor(grade);
  const scanDate = scan.completedAt
    ? new Date(scan.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date(scan.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="card p-8 animate-fade-slide">
      <div className="flex flex-col gap-6">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--accent)" }}>
              Website Audit Report
            </p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {siteUrl ?? "Website Analysis"}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {scanDate} · {scan.pagesCrawled} pages crawled
            </p>
          </div>

          {summary && (
            <div className="flex items-center gap-5 shrink-0">
              {/* Score */}
              <div className="text-center">
                <p className="text-7xl font-black leading-none tabular-nums"
                  style={{ color: scoreColor(summary.overallScore) }}>
                  {summary.overallScore}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>out of 100</p>
              </div>

              {/* Grade */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: `${colors.glow}`,
                  border: `2px solid ${colors.text}`,
                  boxShadow: `0 0 24px ${colors.glow}`,
                }}
              >
                <span className="text-4xl font-black" style={{ color: colors.text }}>{grade}</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Narrative */}
        {summary?.aiNarrative && (
          <div className="rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--accent)" }}>
              Executive Summary
            </p>
            <p className="text-base leading-relaxed" style={{ color: "rgba(240,240,255,0.75)" }}>
              {summary.aiNarrative}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
