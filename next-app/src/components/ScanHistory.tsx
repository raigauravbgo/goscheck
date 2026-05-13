"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { IScan } from "@/models/Scan";
import type { ISiteSummary } from "@/models/SiteSummary";

type HistoryEntry = {
  scan: IScan & { _id: string };
  summary: (ISiteSummary & { _id: string }) | null;
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400",
  B: "text-blue-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-400",
};

const SCORE_COLOR = (score: number) => {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-blue-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
};

const DIMENSION_ORDER = [
  "seo", "content_quality", "grammar", "technical_health",
  "aesthetics", "accessibility", "ux_conversion", "brand_consistency",
];
const DIMENSION_SHORT: Record<string, string> = {
  seo: "SEO", content_quality: "Content", grammar: "Grammar",
  aesthetics: "Design", technical_health: "Tech", accessibility: "A11y",
  ux_conversion: "UX", brand_consistency: "Brand",
};

type Props = {
  domain: string;
  currentScanId: string;
  siteUrl: string;
};

export default function ScanHistory({ domain, currentScanId, siteUrl }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sites/${encodeURIComponent(domain)}/scans`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.history ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [domain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">No completed scans yet for this site.</div>
    );
  }

  // Compute delta vs previous scan
  const withDelta = history.map((entry, idx) => {
    const prev = history[idx + 1];
    const delta =
      entry.summary && prev?.summary
        ? entry.summary.overallScore - prev.summary.overallScore
        : null;
    return { ...entry, delta };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Scan History — {domain}</h2>

      {/* Score trend summary */}
      {history.length >= 2 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Score Trend (newest → oldest)</p>
          <div className="flex items-end gap-3 flex-wrap">
            {[...history].reverse().map((entry, idx) => {
              const score = entry.summary?.overallScore ?? 0;
              const barHeight = Math.max(4, Math.round((score / 100) * 80));
              return (
                <div key={entry.scan._id} className="flex flex-col items-center gap-1">
                  <span className={`text-xs font-bold ${SCORE_COLOR(score)}`}>{score}</span>
                  <div
                    className={`w-8 rounded-t ${score >= 70 ? "bg-blue-600" : score >= 50 ? "bg-yellow-500" : "bg-red-600"}`}
                    style={{ height: barHeight }}
                  />
                  <span className="text-xs text-gray-600">#{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History rows */}
      <div className="space-y-3">
        {withDelta.map(({ scan, summary, delta }) => {
          const isCurrent = scan._id === currentScanId;
          const dimScores = summary?.dimensionScores as Record<string, { score: number }> | undefined;

          return (
            <div
              key={scan._id}
              className={`bg-gray-900 border rounded-xl p-5 ${
                isCurrent ? "border-blue-700" : "border-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isCurrent && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                        Current
                      </span>
                    )}
                    <span className="text-sm text-gray-400">
                      {scan.completedAt
                        ? new Date(scan.completedAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })
                        : "—"}
                    </span>
                    <span className="text-xs text-gray-600">· {scan.pagesCrawled} pages</span>
                  </div>

                  {/* Dimension mini-scores */}
                  {dimScores && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DIMENSION_ORDER.map((dim) => {
                        const s = dimScores[dim]?.score ?? 0;
                        return (
                          <span key={dim} className={`text-xs ${SCORE_COLOR(s)}`}>
                            {DIMENSION_SHORT[dim]}: {s}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {summary && (
                    <div className="flex items-center gap-2">
                      {delta !== null && (
                        <span className={`text-sm font-semibold ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`}
                        </span>
                      )}
                      <span className={`text-3xl font-black ${SCORE_COLOR(summary.overallScore)}`}>
                        {summary.overallScore}
                      </span>
                      <span className={`text-xl font-black ${GRADE_COLORS[summary.grade]}`}>
                        {summary.grade}
                      </span>
                    </div>
                  )}

                  {!isCurrent && (
                    <Link
                      href={`/dashboard/${scan._id}`}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
