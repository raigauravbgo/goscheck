"use client";

import Link from "next/link";

const DIMENSION_LABELS: Record<string, string> = {
  seo: "Search Visibility",
  content_quality: "Message Strength",
  grammar: "Writing Quality",
  aesthetics: "Visual Clarity",
  technical_health: "Site Reliability",
  accessibility: "Accessibility",
  ux_conversion: "Ease of Action",
  brand_consistency: "Brand Coherence",
};

const DIMENSION_ICONS: Record<string, string> = {
  seo: "📈",
  content_quality: "✍️",
  grammar: "📝",
  aesthetics: "🎨",
  technical_health: "⚙️",
  accessibility: "♿",
  ux_conversion: "🎯",
  brand_consistency: "🏷️",
};

const DIMENSION_KEYS = [
  "seo", "content_quality", "grammar", "aesthetics",
  "technical_health", "accessibility", "ux_conversion", "brand_consistency",
] as const;

type DimScores = Record<string, { score: number; weight: number }>;

export type ComparisonSide = {
  scanId: string;
  domain: string;
  overallScore: number | null;
  grade: string | null;
  dimensionScores: DimScores;
  status: string;
};

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--attention)";
  return "var(--critical)";
}

function gradeColor(grade: string) {
  if (grade === "A") return "var(--good)";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "var(--attention)";
  return "var(--critical)";
}

function shortDomain(url: string) {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { return url; }
}

export default function ComparisonView({
  primary,
  comparison,
}: {
  primary: ComparisonSide;
  comparison: ComparisonSide;
}) {
  const primaryDomain = shortDomain(primary.domain);
  const comparisonDomain = shortDomain(comparison.domain);

  const isReady = primary.status === "complete" && comparison.status === "complete";
  const primaryScore = primary.overallScore ?? 0;
  const comparisonScore = comparison.overallScore ?? 0;
  const overallWinner = primaryScore >= comparisonScore ? "primary" : "comparison";
  const delta = primaryScore - comparisonScore;

  return (
    <div className="flex flex-col gap-6">
      {/* Status banner if still running */}
      {!isReady && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ background: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--accent)" }}>
            {primary.status !== "complete" && comparison.status !== "complete"
              ? "Both scans are running — comparison will appear when complete."
              : primary.status !== "complete"
              ? `Scanning ${primaryDomain}…`
              : `Scanning ${comparisonDomain}…`}
          </span>
        </div>
      )}

      {/* Overall scorecard header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Primary */}
        <SiteScoreCard
          scanId={primary.scanId}
          domain={primaryDomain}
          score={primaryScore}
          grade={primary.grade}
          isWinner={overallWinner === "primary"}
          label="Your site"
        />

        {/* VS divider */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
            VS
          </div>
          {isReady && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: delta > 0 ? "rgba(34,197,94,0.1)" : delta < 0 ? "rgba(239,68,68,0.1)" : "var(--surface2)",
                color: delta > 0 ? "var(--good)" : delta < 0 ? "var(--critical)" : "var(--text-dim)",
                border: `1px solid ${delta > 0 ? "rgba(34,197,94,0.25)" : delta < 0 ? "rgba(239,68,68,0.25)" : "var(--border)"}`,
              }}>
              {delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : "Tied"}
            </span>
          )}
        </div>

        {/* Comparison */}
        <SiteScoreCard
          scanId={comparison.scanId}
          domain={comparisonDomain}
          score={comparisonScore}
          grade={comparison.grade}
          isWinner={overallWinner === "comparison"}
          label="Competitor"
        />
      </div>

      {/* Dimension breakdown */}
      {isReady && (
        <div className="card p-6 flex flex-col gap-1">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Dimension Breakdown
          </h3>
          <div className="flex flex-col gap-3">
            {DIMENSION_KEYS.map((dim) => {
              const pScore = primary.dimensionScores[dim]?.score ?? null;
              const cScore = comparison.dimensionScores[dim]?.score ?? null;
              if (pScore === null && cScore === null) return null;
              const ps = pScore ?? 0;
              const cs = cScore ?? 0;
              const winner = ps >= cs ? "primary" : "comparison";
              const dimDelta = ps - cs;

              return (
                <div key={dim}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{DIMENSION_ICONS[dim]}</span>
                    <span className="text-xs font-medium flex-1" style={{ color: "var(--text-dim)" }}>
                      {DIMENSION_LABELS[dim]}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: dimDelta > 0 ? "rgba(34,197,94,0.1)" : dimDelta < 0 ? "rgba(239,68,68,0.1)" : "var(--surface2)",
                        color: dimDelta > 0 ? "var(--good)" : dimDelta < 0 ? "var(--critical)" : "var(--text-dim)",
                      }}>
                      {dimDelta > 0 ? `+${dimDelta}` : dimDelta < 0 ? `${dimDelta}` : "="}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Primary bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${ps}%`, background: winner === "primary" ? scoreColor(ps) : "rgba(255,255,255,0.2)" }} />
                      </div>
                      <span className="text-xs tabular-nums w-6 text-right font-bold"
                        style={{ color: winner === "primary" ? scoreColor(ps) : "var(--text-dim)" }}>
                        {ps}
                      </span>
                      {winner === "primary" && <span className="text-xs" style={{ color: "var(--good)" }}>▲</span>}
                    </div>

                    {/* Comparison bar */}
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${cs}%`, background: winner === "comparison" ? scoreColor(cs) : "rgba(255,255,255,0.2)" }} />
                      </div>
                      <span className="text-xs tabular-nums w-6 text-left font-bold"
                        style={{ color: winner === "comparison" ? scoreColor(cs) : "var(--text-dim)" }}>
                        {cs}
                      </span>
                      {winner === "comparison" && <span className="text-xs" style={{ color: "var(--good)" }}>▲</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{primaryDomain}</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>{comparisonDomain}</span>
          </div>
        </div>
      )}

      {/* Win summary */}
      {isReady && (
        <div className="grid grid-cols-3 gap-3">
          {(() => {
            let primaryWins = 0;
            let comparisonWins = 0;
            let ties = 0;
            for (const dim of DIMENSION_KEYS) {
              const ps = primary.dimensionScores[dim]?.score ?? 0;
              const cs = comparison.dimensionScores[dim]?.score ?? 0;
              if (ps > cs) primaryWins++;
              else if (cs > ps) comparisonWins++;
              else ties++;
            }
            return [
              { label: `${primaryDomain} leads`, count: primaryWins, color: "var(--good)" },
              { label: `${comparisonDomain} leads`, count: comparisonWins, color: "var(--critical)" },
              { label: "Tied", count: ties, color: "var(--text-dim)" },
            ].map(({ label, count, color }) => (
              <div key={label} className="rounded-xl p-4 text-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-2xl font-black tabular-nums" style={{ color }}>{count}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{label}</p>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function SiteScoreCard({
  scanId,
  domain,
  score,
  grade,
  isWinner,
  label,
}: {
  scanId: string;
  domain: string;
  score: number | null;
  grade: string | null;
  isWinner: boolean;
  label: string;
}) {
  return (
    <Link href={`/dashboard/${scanId}`}
      className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all"
      style={{
        background: isWinner ? "rgba(34,197,94,0.05)" : "var(--surface)",
        border: `1px solid ${isWinner ? "rgba(34,197,94,0.25)" : "var(--border)"}`,
        textDecoration: "none",
      }}>
      <span className="text-xs font-medium uppercase tracking-widest"
        style={{ color: isWinner ? "var(--good)" : "var(--text-dim)" }}>
        {label} {isWinner && "🏆"}
      </span>
      <p className="text-sm font-semibold text-center truncate w-full text-center"
        style={{ color: "var(--text)" }}>
        {domain}
      </p>
      {grade && score !== null ? (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `${gradeColor(grade)}18`,
              border: `2px solid ${gradeColor(grade)}`,
            }}>
            <span className="text-3xl font-black" style={{ color: gradeColor(grade) }}>{grade}</span>
          </div>
          <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor(score) }}>{score}</span>
        </>
      ) : (
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      )}
    </Link>
  );
}
