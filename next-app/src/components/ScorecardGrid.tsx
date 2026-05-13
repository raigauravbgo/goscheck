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

const DIMENSION_ORDER = [
  "seo", "content_quality", "grammar", "technical_health",
  "aesthetics", "accessibility", "ux_conversion", "brand_consistency",
];

function scoreColor(score: number) {
  if (score >= 70) return { text: "var(--good)", bar: "var(--good)", badge: "badge-good", label: "Good" };
  if (score >= 50) return { text: "var(--attention)", bar: "var(--attention)", badge: "badge-attention", label: "Needs Attention" };
  return { text: "var(--critical)", bar: "var(--critical)", badge: "badge-critical", label: "Critical" };
}

type Props = {
  scanId: string;
  dimensionScores: Record<string, { score: number; weight: number }>;
};

export default function ScorecardGrid({ scanId, dimensionScores }: Props) {
  return (
    <div className="animate-fade-slide" style={{ animationDelay: "0.1s", opacity: 0, animationFillMode: "forwards" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Category Scores</h2>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>Click any category for details</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DIMENSION_ORDER.map((dim) => {
          const entry = dimensionScores[dim];
          if (!entry) return null;
          const { score } = entry;
          const c = scoreColor(score);

          return (
            <Link
              key={dim}
              href={`/dashboard/${scanId}/dimensions/${dim}`}
              className="card-hover text-left p-4 flex flex-col gap-3 transition-all"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-base leading-none">{DIMENSION_ICONS[dim]}</span>
                <span className="text-2xl font-black tabular-nums" style={{ color: c.text }}>{score}</span>
              </div>

              <div>
                <p className="text-xs font-medium leading-tight mb-2" style={{ color: "var(--text-muted)" }}>
                  {DIMENSION_LABELS[dim] ?? dim}
                </p>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${score}%`, background: c.bar }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${c.badge}`}>
                  {c.label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
