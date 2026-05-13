"use client";

import { useEffect, useState, useRef } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────

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

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  seo: "How well search engines can discover, index, and rank your pages. Covers meta tags, structured data, crawlability, and keyword relevance.",
  content_quality: "The strength and clarity of your messaging. Covers value proposition, audience relevance, depth, and persuasiveness.",
  grammar: "Writing professionalism and clarity. Covers grammar correctness, readability, tone consistency, and sentence structure.",
  aesthetics: "Visual design quality and clarity. Covers layout, typography, color use, whitespace, and first impressions.",
  technical_health: "Underlying site reliability and performance. Covers Core Web Vitals, errors, security, and crawlability.",
  accessibility: "How inclusive your site is for all users. Covers WCAG compliance, screen reader support, keyboard navigation, and contrast.",
  ux_conversion: "How effectively your site converts visitors. Covers CTAs, navigation clarity, friction points, and conversion flow.",
  brand_consistency: "How cohesive your brand appears across pages. Covers voice, tone, visual identity, and messaging alignment.",
};

type Action = {
  id: string;
  label: string;
  description: string;
  icon: string;
  variant?: "primary" | "default";
};

const DIMENSION_ACTIONS: Record<string, Action[]> = {
  seo: [
    { id: "generate_meta_descriptions", label: "Write Meta Descriptions", description: "AI-crafted meta titles and descriptions for your lowest-scoring pages", icon: "✏️", variant: "primary" },
  ],
  content_quality: [
    { id: "generate_blog_ideas", label: "Generate Blog Ideas", description: "10 strategic content ideas to fill your content gaps", icon: "💡", variant: "primary" },
    { id: "generate_blog_post", label: "Write a Full Blog Post", description: "Generate a complete, ready-to-publish article for your site", icon: "📄" },
    { id: "generate_content_brief", label: "Create Content Brief", description: "Detailed brief for rewriting your weakest page", icon: "📋" },
  ],
  grammar: [
    { id: "generate_grammar_fixes", label: "Writing Improvement Guide", description: "Specific grammar fixes and style recommendations per page", icon: "✍️", variant: "primary" },
  ],
  aesthetics: [
    { id: "generate_design_recommendations", label: "Design Recommendations", description: "Actionable visual design improvements with specific CSS fixes", icon: "🎨", variant: "primary" },
  ],
  technical_health: [
    { id: "generate_technical_checklist", label: "Technical Fix Checklist", description: "Prioritized developer checklist for performance and reliability", icon: "⚙️", variant: "primary" },
  ],
  accessibility: [
    { id: "generate_accessibility_report", label: "Accessibility Report", description: "WCAG audit with prioritized fixes and implementation checklist", icon: "♿", variant: "primary" },
  ],
  ux_conversion: [
    { id: "generate_cta_improvements", label: "CTA & Conversion Improvements", description: "Rewritten CTAs, A/B test ideas, and conversion funnel fixes", icon: "🎯", variant: "primary" },
  ],
  brand_consistency: [
    { id: "generate_brand_voice_guide", label: "Brand Voice Guide", description: "Practical brand voice guide with templates and writing do's/don'ts", icon: "🏷️", variant: "primary" },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PageEntry = {
  url: string;
  score: number;
  severity: "good" | "needs_attention" | "critical";
  confidence: number;
};

type DimensionData = {
  dimension: string;
  aggregateScore: number | null;
  weight: number | null;
  pageBreakdown: PageEntry[];
  worstPages: PageEntry[];
  bestPages: PageEntry[];
  totalPages: number;
};

type ActionResult = {
  actionId: string;
  result: string;
};

type Props = {
  scanId: string;
  dimension: string | null;
  onClose: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--attention)";
  return "var(--critical)";
}

function severityBadge(severity: string) {
  if (severity === "good") return "badge-good";
  if (severity === "needs_attention") return "badge-attention";
  return "badge-critical";
}

function severityLabel(severity: string) {
  if (severity === "good") return "Good";
  if (severity === "needs_attention") return "Needs Attention";
  return "Critical";
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

// ─── Markdown-ish renderer (bold, bullets, headings) ─────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold mt-4 mb-1" style={{ color: "var(--accent)" }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold mt-5 mb-1" style={{ color: "var(--text)" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(
        <p key={i} className="text-sm font-semibold mt-3 mb-1" style={{ color: "var(--text)" }}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 py-0.5">
          <span style={{ color: "var(--accent)", flexShrink: 0 }}>›</span>
          <span className="text-sm" style={{ color: "rgba(240,240,255,0.75)" }}>
            {inlineBold(line.slice(2))}
          </span>
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1] ?? "";
      elements.push(
        <div key={i} className="flex gap-2 py-0.5">
          <span className="text-xs font-bold tabular-nums" style={{ color: "var(--accent)", flexShrink: 0, minWidth: "1.2rem" }}>{num}.</span>
          <span className="text-sm" style={{ color: "rgba(240,240,255,0.75)" }}>
            {inlineBold(line.replace(/^\d+\. /, ""))}
          </span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed" style={{ color: "rgba(240,240,255,0.75)" }}>
          {inlineBold(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "var(--text)" }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DimensionDrawer({ scanId, dimension, onClose }: Props) {
  const [data, setData] = useState<DimensionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const [showAllPages, setShowAllPages] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isOpen = !!dimension;

  // Load dimension data + cached action results when dimension changes
  useEffect(() => {
    if (!dimension || !scanId) return;
    setData(null);
    setLoading(true);
    setActiveAction(null);
    setShowAllPages(false);

    // Restore any previously generated results from localStorage
    const cached: Record<string, ActionResult> = {};
    const actions = DIMENSION_ACTIONS[dimension] ?? [];
    for (const action of actions) {
      const key = `goscheck:action:${scanId}:${dimension}:${action.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          cached[action.id] = JSON.parse(stored) as ActionResult;
        } catch {}
      }
    }
    setActionResults(cached);

    fetch(`/api/scans/${scanId}/dimensions/${dimension}`)
      .then((r) => r.json())
      .then((d: DimensionData) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dimension, scanId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const runAction = async (actionId: string) => {
    if (!dimension || actionLoading) return;
    setActionError(null);
    setActionLoading(actionId);
    setActiveAction(actionId);

    try {
      const res = await fetch(`/api/scans/${scanId}/dimensions/${dimension}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionId }),
      });
      const json = await res.json() as { result?: string; error?: string };
      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Server error ${res.status}`);
      }
      const result: ActionResult = { actionId, result: json.result ?? "" };
      setActionResults((prev) => ({ ...prev, [actionId]: result }));
      // Persist to localStorage so it survives drawer close/reopen and page refresh
      const key = `goscheck:action:${scanId}:${dimension}:${actionId}`;
      localStorage.setItem(key, JSON.stringify(result));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const actions = DIMENSION_ACTIONS[dimension ?? ""] ?? [];
  const displayPages = showAllPages ? (data?.pageBreakdown ?? []) : (data?.worstPages ?? []);

  return (
    <>
      {/* Backdrop — only rendered when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        />
      )}

      {/* Drawer — always mounted, hidden via CSS when closed so state is preserved */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "min(680px, 95vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: isOpen ? "-24px 0 80px rgba(0,0,0,0.6)" : "none",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          visibility: isOpen ? "visible" : "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{DIMENSION_ICONS[dimension ?? ""] ?? "📊"}</span>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                {DIMENSION_LABELS[dimension ?? ""] ?? dimension}
              </h2>
              {data && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {data.totalPages} pages analyzed
                  {data.aggregateScore !== null && (
                    <> · Avg score: <span style={{ color: scoreColor(data.aggregateScore) }}>{data.aggregateScore}</span></>
                  )}
                  {data.weight !== null && <> · {Math.round(data.weight * 100)}% of overall score</>}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          )}

          {!loading && data && (
            <>
              {/* Description */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {DIMENSION_DESCRIPTIONS[dimension ?? ""]}
                </p>
              </div>

              {/* Score bar */}
              {data.aggregateScore !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>Category Score</span>
                    <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor(data.aggregateScore) }}>
                      {data.aggregateScore}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${data.aggregateScore}%`, background: scoreColor(data.aggregateScore) }}
                    />
                  </div>
                </div>
              )}

              {/* Pages breakdown */}
              {data.pageBreakdown.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {showAllPages ? "All Pages" : "Worst Performing Pages"}
                    </h3>
                    {data.pageBreakdown.length > 5 && (
                      <button
                        onClick={() => setShowAllPages((p) => !p)}
                        className="text-xs px-3 py-1 rounded-full transition-colors"
                        style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "rgba(99,102,241,0.1)" }}
                      >
                        {showAllPages ? `Show worst 5` : `Show all ${data.totalPages}`}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {displayPages.map((page) => (
                      <div
                        key={page.url}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                      >
                        {/* Score dot */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums shrink-0"
                          style={{ background: `${scoreColor(page.score)}20`, color: scoreColor(page.score) }}
                        >
                          {page.score}
                        </div>

                        {/* URL */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }} title={page.url}>
                            {shortUrl(page.url)}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-dim)" }}>
                            {page.url}
                          </p>
                        </div>

                        {/* Badge */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${severityBadge(page.severity)}`}>
                          {severityLabel(page.severity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Best pages (collapsed summary) */}
                  {!showAllPages && data.bestPages.length > 0 && (
                    <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--good)" }}>Best performing pages</p>
                      <div className="flex flex-col gap-0.5">
                        {data.bestPages.map((p) => (
                          <div key={p.url} className="flex items-center justify-between">
                            <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>{shortUrl(p.url)}</span>
                            <span className="text-xs font-bold tabular-nums" style={{ color: "var(--good)" }}>{p.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Agentic Actions */}
              {actions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>AI Actions</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.3)" }}>
                      GPT-4.1
                    </span>
                  </div>
                  <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
                    Generate ready-to-use content and fixes tailored to your site's actual pages.
                  </p>

                  {actionError && (
                    <div className="px-4 py-3 rounded-xl mb-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--critical)" }}>
                      {actionError}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {actions.map((action) => {
                      const isRunning = actionLoading === action.id;
                      const hasResult = !!actionResults[action.id];
                      const isActive = activeAction === action.id;

                      return (
                        <div key={action.id}>
                          <button
                            onClick={() => {
                              if (hasResult && isActive) {
                                setActiveAction(null);
                              } else if (hasResult) {
                                setActiveAction(action.id);
                              } else {
                                runAction(action.id);
                              }
                            }}
                            disabled={!!actionLoading && !isRunning}
                            className="w-full text-left px-4 py-3 rounded-xl transition-all"
                            style={{
                              background: action.variant === "primary"
                                ? (isActive || hasResult ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)")
                                : "var(--surface2)",
                              border: `1px solid ${action.variant === "primary" ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
                              opacity: (!!actionLoading && !isRunning) ? 0.5 : 1,
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{action.icon}</span>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: action.variant === "primary" ? "var(--accent)" : "var(--text)" }}>
                                    {action.label}
                                  </p>
                                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                                    {action.description}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isRunning ? (
                                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                                ) : hasResult ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(34,197,94,0.1)", color: "var(--good)", border: "1px solid rgba(34,197,94,0.25)" }}>
                                    {isActive ? "▲ hide" : "▼ view"}
                                  </span>
                                ) : (
                                  <span className="text-xs px-3 py-1 rounded-lg font-medium"
                                    style={{ background: "var(--accent)", color: "white" }}>
                                    Generate →
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Result panel */}
                          {hasResult && isActive && actionResults[action.id] && (
                            <div
                              className="mt-2 rounded-xl p-5 animate-fade"
                              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                                  Generated Output
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(actionResults[action.id].result);
                                  }}
                                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                                {renderMarkdown(actionResults[action.id].result)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </>
  );
}
