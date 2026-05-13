"use client";

import { useEffect, useRef } from "react";
import type { ProgressEntry } from "@/models/Scan";

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--attention)";
  return "var(--critical)";
}

function severityDot(severity: string) {
  if (severity === "good") return "var(--good)";
  if (severity === "needs_attention") return "var(--attention)";
  return "var(--critical)";
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "/" : u.pathname.replace(/\/$/, "");
    return path.length > 55 ? path.slice(0, 52) + "…" : path;
  } catch {
    return url.slice(0, 55);
  }
}

type Props = {
  progressLog: ProgressEntry[];
  totalPages: number;
  currentStage: string;
  siteUrl: string;
};

export default function ScanFeed({ progressLog, totalPages, currentStage, siteUrl }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLog.length]);

  const analyzed = progressLog.length;
  const stageLabel =
    currentStage === "crawling" ? "Crawling site…" :
    currentStage === "analyzing" ? `Analyzing pages…` :
    currentStage === "synthesizing" ? "Generating intelligence report…" :
    "Processing…";

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Stage header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{stageLabel}</span>
        </div>
        {totalPages > 0 && (
          <span className="text-sm mono" style={{ color: "var(--text-muted)" }}>
            {analyzed} / {totalPages} pages
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalPages > 0 && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round((analyzed / totalPages) * 100)}%`,
              background: "var(--accent)",
              boxShadow: "0 0 8px var(--accent-glow)",
            }}
          />
        </div>
      )}

      {/* Terminal feed */}
      <div
        className="flex-1 rounded-xl overflow-y-auto p-4 mono text-xs flex flex-col gap-1.5"
        style={{
          background: "#050508",
          border: "1px solid var(--border)",
          minHeight: 320,
          maxHeight: 480,
        }}
      >
        {/* Domain header */}
        <div className="mb-2 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--accent)" }}>$ goscheck scan </span>
          <span style={{ color: "var(--text-muted)" }}>{siteUrl}</span>
        </div>

        {progressLog.length === 0 && (
          <div className="flex items-center gap-2 mt-2" style={{ color: "var(--text-dim)" }}>
            <span className="animate-pulse">▋</span>
            <span>Crawling pages…</span>
          </div>
        )}

        {progressLog.map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-2 animate-scan-line"
            style={{ animationDelay: `0ms` }}
          >
            {/* Status dot */}
            <span style={{ color: severityDot(entry.severity), flexShrink: 0 }}>●</span>

            {/* URL */}
            <span className="flex-1 truncate" style={{ color: "var(--text-muted)" }}>
              {shortUrl(entry.url)}
            </span>

            {/* Score pills */}
            <span className="flex gap-1.5 shrink-0">
              <span style={{ color: scoreColor(entry.seo) }}>SEO:{entry.seo}</span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span style={{ color: scoreColor(entry.content) }}>Con:{entry.content}</span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span style={{ color: scoreColor(entry.technical) }}>Tech:{entry.technical}</span>
            </span>

            {/* Overall */}
            <span className="w-14 text-right shrink-0 font-bold" style={{ color: scoreColor(entry.overallScore) }}>
              {entry.overallScore}/100
            </span>
          </div>
        ))}

        {currentStage === "synthesizing" && (
          <div className="flex items-center gap-2 mt-1" style={{ color: "var(--accent)" }}>
            <span className="animate-pulse">▋</span>
            <span>Generating executive intelligence report…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
