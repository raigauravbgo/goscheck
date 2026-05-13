"use client";

import { useState } from "react";
import type { IFinding } from "@/models/Finding";

const DIMENSION_LABELS: Record<string, string> = {
  seo: "SEO",
  content_quality: "Content",
  grammar: "Grammar",
  aesthetics: "Design",
  technical_health: "Technical",
  accessibility: "Accessibility",
  ux_conversion: "UX",
  brand_consistency: "Brand",
};

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  quick_win: { label: "Quick Win", color: "bg-green-950 text-green-400 border-green-800" },
  moderate: { label: "Moderate", color: "bg-yellow-950 text-yellow-400 border-yellow-800" },
  complex: { label: "Complex", color: "bg-red-950 text-red-400 border-red-800" },
};

const OWNER_LABELS: Record<string, string> = {
  content_team: "Content Team",
  developer: "Developer",
  quick_self_fix: "Self-fix",
};

type Props = {
  findings: (IFinding & { _id: string })[];
  activeDimension: string | null;
  onSelectFinding: (f: IFinding & { _id: string }) => void;
  onToggleFixed: (f: IFinding & { _id: string }) => void;
};

type OwnerFilter = "all" | "content_team" | "developer" | "quick_self_fix";

export default function IssueBacklog({ findings, activeDimension, onSelectFinding, onToggleFixed }: Props) {
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [showFixed, setShowFixed] = useState(false);

  const visible = findings.filter((f) => {
    if (!showFixed && f.status === "fixed") return false;
    if (ownerFilter !== "all" && f.ownerTag !== ownerFilter) return false;
    return true;
  });

  const openCount = findings.filter((f) => f.status === "open").length;

  return (
    <div>
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white">
          Issues{" "}
          <span className="text-sm font-normal text-gray-500">
            {openCount} open
          </span>
        </h2>

        <div className="flex flex-wrap gap-2 text-sm">
          {(["all", "content_team", "developer", "quick_self_fix"] as OwnerFilter[]).map((tag) => (
            <button
              key={tag}
              onClick={() => setOwnerFilter(tag)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                ownerFilter === tag
                  ? "bg-white text-gray-950 border-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {tag === "all" ? "All owners" : OWNER_LABELS[tag]}
            </button>
          ))}
          <button
            onClick={() => setShowFixed((v) => !v)}
            className={`px-3 py-1 rounded-full border transition-colors ${
              showFixed
                ? "bg-gray-700 text-white border-gray-600"
                : "border-gray-700 text-gray-500 hover:border-gray-500"
            }`}
          >
            {showFixed ? "Hide fixed" : "Show fixed"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 w-6"></th>
              <th className="text-left px-4 py-3">Issue</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Effort</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Owner</th>
              <th className="text-left px-4 py-3 w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-600">
                  No issues match current filters.
                </td>
              </tr>
            ) : (
              visible.map((finding) => {
                const effort = EFFORT_LABELS[finding.effortLevel];
                return (
                  <tr
                    key={finding._id}
                    className={`transition-colors hover:bg-gray-800/60 cursor-pointer ${
                      finding.status === "fixed" ? "opacity-50" : ""
                    }`}
                    onClick={() => onSelectFinding(finding)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={finding.status === "fixed"}
                        onChange={() => onToggleFixed(finding)}
                        className="w-4 h-4 accent-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium leading-snug">{finding.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{finding.impactStatement}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-400">
                        {DIMENSION_LABELS[finding.dimension] ?? finding.dimension}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {effort && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${effort.color}`}>
                          {effort.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400">
                      {OWNER_LABELS[finding.ownerTag] ?? finding.ownerTag}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          finding.status === "fixed"
                            ? "bg-green-950 text-green-400 border-green-800"
                            : "bg-gray-800 text-gray-400 border-gray-700"
                        }`}
                      >
                        {finding.status === "fixed" ? "Fixed" : "Open"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
