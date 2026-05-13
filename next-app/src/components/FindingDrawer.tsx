"use client";

import { useEffect } from "react";
import type { IFinding } from "@/models/Finding";

const DIMENSION_LABELS: Record<string, string> = {
  seo: "SEO / Search Visibility",
  content_quality: "Content Quality",
  grammar: "Grammar & Writing",
  aesthetics: "Visual Design",
  technical_health: "Technical Health",
  accessibility: "Accessibility",
  ux_conversion: "UX & Conversion",
  brand_consistency: "Brand Consistency",
};

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  quick_win: { label: "Quick Win (<1 hour)", color: "bg-green-950 text-green-400 border-green-800" },
  moderate: { label: "Moderate (half day)", color: "bg-yellow-950 text-yellow-400 border-yellow-800" },
  complex: { label: "Complex (developer needed)", color: "bg-red-950 text-red-400 border-red-800" },
};

const OWNER_LABELS: Record<string, string> = {
  content_team: "Content Team",
  developer: "Developer",
  quick_self_fix: "You can fix this yourself",
};

type Props = {
  finding: (IFinding & { _id: string }) | null;
  onClose: () => void;
  onToggleFixed: (f: IFinding & { _id: string }) => void;
};

export default function FindingDrawer({ finding, onClose, onToggleFixed }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!finding) return null;

  const effort = EFFORT_LABELS[finding.effortLevel];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                {DIMENSION_LABELS[finding.dimension] ?? finding.dimension}
              </p>
              <h2 className="text-xl font-bold text-white leading-snug">{finding.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors mt-1 shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {effort && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${effort.color}`}>
                {effort.label}
              </span>
            )}
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-gray-700 text-gray-400">
              {OWNER_LABELS[finding.ownerTag] ?? finding.ownerTag}
            </span>
            {finding.aiConfidence > 0 && (
              <span className="text-xs font-medium px-3 py-1 rounded-full border border-gray-800 text-gray-600">
                {Math.round(finding.aiConfidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Business impact */}
          <div className="bg-yellow-950/40 border border-yellow-900/50 rounded-xl p-4">
            <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wide mb-1">Business Impact</p>
            <p className="text-yellow-200 text-sm leading-relaxed">{finding.impactStatement}</p>
          </div>

          {/* Root cause */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">What's wrong</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{finding.description}</p>
          </div>

          {/* Fix steps */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">How to fix it</h3>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{finding.fixSteps}</p>
          </div>

          {/* Mark as fixed */}
          <button
            onClick={() => onToggleFixed(finding)}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
              finding.status === "fixed"
                ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {finding.status === "fixed" ? "Mark as Open" : "Mark as Fixed"}
          </button>
        </div>
      </div>
    </>
  );
}
