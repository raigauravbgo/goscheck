"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type PageEntry = {
  url: string;
  score: number;
  severity: "good" | "needs_attention" | "critical";
  confidence: number;
};

type FindingRow = {
  _id: string;
  title: string;
  description: string;
  impactStatement: string;
  fixSteps: string;
  effortLevel: "quick_win" | "moderate" | "complex";
  ownerTag: "content_team" | "developer" | "quick_self_fix";
  status: "open" | "fixed";
  aiConfidence: number;
  pageUrl: string | null;
};

type L2Issue = {
  title: string;
  description: string;
  severity: "critical" | "moderate" | "minor" | "needs_attention" | string;
  location?: string;
  suggestedFix?: string;
};

type L2Group = {
  _id: string;
  url: string;
  generatedAt: string;
  issues: L2Issue[];
};

type TrackerPushRow = {
  _id: string;
  url: string;
  issueTitle: string;
  trackerType: "jira" | "linear";
  ticketId: string;
  ticketUrl: string;
  pushedAt: string;
};

type DimensionData = {
  dimension: string;
  aggregateScore: number | null;
  weight: number | null;
  pageBreakdown: PageEntry[];
  worstPages: PageEntry[];
  bestPages: PageEntry[];
  totalPages: number;
  findings: FindingRow[];
  l2Issues: L2Group[];
  trackerPushes: TrackerPushRow[];
};

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--attention)";
  return "var(--critical)";
}

function severityRank(s: string): number {
  if (s === "critical") return 0;
  if (s === "moderate" || s === "needs_attention") return 1;
  return 2;
}

function severityLabel(s: string) {
  if (s === "critical") return "High";
  if (s === "moderate" || s === "needs_attention") return "Medium";
  return "Low";
}

function severityColor(s: string) {
  if (s === "critical") return "var(--critical)";
  if (s === "moderate" || s === "needs_attention") return "var(--attention)";
  return "var(--good)";
}

function effortMeta(e: string) {
  if (e === "quick_win") return { label: "Quick Win", color: "var(--good)" };
  if (e === "complex") return { label: "Complex", color: "var(--critical)" };
  return { label: "Moderate", color: "var(--attention)" };
}

function ownerLabel(o: string) {
  if (o === "content_team") return "Content Team";
  if (o === "developer") return "Developer";
  return "Self-fix";
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

export default function DimensionPage() {
  const params = useParams<{ scanId: string; dimension: string }>();
  const { scanId, dimension } = params;

  const [data, setData] = useState<DimensionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllPages, setShowAllPages] = useState(false);
  const [expandedL2, setExpandedL2] = useState<string | null>(null);
  const [pushingKey, setPushingKey] = useState<string | null>(null);
  const [drillingUrl, setDrillingUrl] = useState<string | null>(null);
  const [drillError, setDrillError] = useState<string | null>(null);

  const l2ByUrl = new Map((data?.l2Issues ?? []).map((g) => [g.url, g]));

  const handleDrillDown = async (url: string) => {
    if (drillingUrl) return;
    setDrillingUrl(url);
    setDrillError(null);
    try {
      const res = await fetch(`/api/scans/${scanId}/pages/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, dimension }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        result?: L2Group;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.result) {
        throw new Error(json.error ?? "Drill-down failed");
      }
      setData((prev) => {
        if (!prev) return prev;
        const newGroup = json.result!;
        const others = prev.l2Issues.filter((g) => g.url !== newGroup.url);
        return { ...prev, l2Issues: [newGroup, ...others] };
      });
      setExpandedL2(json.result._id);
    } catch (e) {
      setDrillError((e as Error).message);
    } finally {
      setDrillingUrl(null);
    }
  };

  const pushKey = (url: string, title: string) => `${url}::${title}`;
  const pushed = data?.trackerPushes
    ? new Map(data.trackerPushes.map((t) => [pushKey(t.url, t.issueTitle), t]))
    : new Map<string, TrackerPushRow>();

  const handlePushToJira = async (url: string, issueTitle: string) => {
    const key = pushKey(url, issueTitle);
    if (pushingKey || pushed.get(key)) return;
    setPushingKey(key);
    try {
      const res = await fetch(`/api/issues/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          url,
          dimension,
          issueTitle,
          trackerType: "jira",
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        ticketId?: string;
        ticketUrl?: string;
        pushedAt?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Push failed");
      setData((prev) =>
        prev
          ? {
              ...prev,
              trackerPushes: [
                ...prev.trackerPushes.filter((t) => pushKey(t.url, t.issueTitle) !== key),
                {
                  _id: `local-${Date.now()}`,
                  url,
                  issueTitle,
                  trackerType: "jira",
                  ticketId: json.ticketId!,
                  ticketUrl: json.ticketUrl!,
                  pushedAt: json.pushedAt ?? new Date().toISOString(),
                },
              ],
            }
          : prev
      );
    } catch {
      // swallow — button stays in default state
    } finally {
      setPushingKey(null);
    }
  };

  useEffect(() => {
    if (!scanId || !dimension) return;
    setLoading(true);
    fetch(`/api/scans/${scanId}/dimensions/${dimension}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load dimension");
        return r.json() as Promise<DimensionData>;
      })
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [scanId, dimension]);

  const icon = DIMENSION_ICONS[dimension] ?? "📊";
  const label = DIMENSION_LABELS[dimension] ?? dimension;
  const description = DIMENSION_DESCRIPTIONS[dimension] ?? "";

  const displayPages = showAllPages ? data?.pageBreakdown ?? [] : data?.worstPages ?? [];
  const findingsRanked = data?.findings
    ? [...data.findings].sort((a, b) => {
        const aSev = a.aiConfidence >= 0.85 ? 0 : a.aiConfidence >= 0.7 ? 1 : 2;
        const bSev = b.aiConfidence >= 0.85 ? 0 : b.aiConfidence >= 0.7 ? 1 : 2;
        if (aSev !== bSev) return aSev - bSev;
        return b.aiConfidence - a.aiConfidence;
      })
    : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(7,7,15,0.8)", backdropFilter: "blur(12px)" }}
        className="sticky top-0 z-30"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/dashboard/${scanId}`} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            ← Back to scan
          </Link>
          <Link href="/dashboard" className="text-sm" style={{ color: "var(--text-muted)" }}>All scans</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {!loading && error && (
          <div className="card p-8 text-center">
            <p className="text-lg font-semibold mb-1" style={{ color: "var(--critical)" }}>Could not load category</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Header */}
            <div className="card p-6 flex flex-col gap-4 animate-fade-slide">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent)" }}>Category</p>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{label}</h1>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {data.totalPages} pages analyzed
                      {data.weight !== null && <> · {Math.round(data.weight * 100)}% of overall score</>}
                    </p>
                  </div>
                </div>
                {data.aggregateScore !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-5xl font-black leading-none tabular-nums" style={{ color: scoreColor(data.aggregateScore) }}>
                      {data.aggregateScore}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>category score</p>
                  </div>
                )}
              </div>

              {description && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>
              )}

              {data.aggregateScore !== null && (
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${data.aggregateScore}%`, background: scoreColor(data.aggregateScore) }}
                  />
                </div>
              )}
            </div>

            {/* Findings ranked */}
            {findingsRanked.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    Issues <span className="text-sm font-normal" style={{ color: "var(--text-dim)" }}>{findingsRanked.length} identified</span>
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {findingsRanked.map((f) => {
                    const severityKey = f.aiConfidence >= 0.85 ? "critical" : f.aiConfidence >= 0.7 ? "moderate" : "minor";
                    const effort = effortMeta(f.effortLevel);
                    const urlForPush = f.pageUrl ?? data.l2Issues[0]?.url ?? "";
                    const key = pushKey(urlForPush, f.title);
                    const pushedRow = urlForPush ? pushed.get(key) : undefined;
                    const isPushing = pushingKey === key;
                    return (
                      <div
                        key={f._id}
                        className="card p-5 flex flex-col gap-3"
                        style={{ opacity: f.status === "fixed" ? 0.55 : 1 }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: `${severityColor(severityKey)}18`,
                              color: severityColor(severityKey),
                              border: `1px solid ${severityColor(severityKey)}40`,
                            }}
                          >
                            {severityLabel(severityKey)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold leading-snug" style={{ color: "var(--text)" }}>{f.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: effort.color, border: `1px solid ${effort.color}40` }}>
                              {effort.label}
                            </span>
                            <span className="text-xs" style={{ color: "var(--text-dim)" }}>{ownerLabel(f.ownerTag)}</span>
                          </div>
                        </div>

                        <div className="rounded-xl p-3" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.18)" }}>
                          <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--attention)" }}>Business Impact</p>
                          <p className="text-sm" style={{ color: "rgba(240,240,255,0.78)" }}>{f.impactStatement}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-dim)" }}>What's wrong</p>
                          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.description}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-dim)" }}>How to fix it</p>
                          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-muted)" }}>{f.fixSteps}</p>
                        </div>

                        {f.pageUrl && (
                          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                            On page: <span style={{ color: "var(--text-muted)" }}>{shortUrl(f.pageUrl)}</span>
                          </p>
                        )}

                        <div className="flex items-center justify-end">
                          {pushedRow ? (
                            <a
                              href={pushedRow.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 rounded-lg font-medium"
                              style={{
                                background: "rgba(34,197,94,0.1)",
                                color: "var(--good)",
                                border: "1px solid rgba(34,197,94,0.3)",
                              }}
                            >
                              ✓ Sent to Jira — {pushedRow.ticketId}
                            </a>
                          ) : (
                            <button
                              onClick={() => urlForPush && handlePushToJira(urlForPush, f.title)}
                              disabled={!urlForPush || isPushing}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: "var(--accent)" }}
                            >
                              {isPushing ? "Sending…" : "Send to Jira →"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* L2 deep-dive issues */}
            {data.l2Issues.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
                  Deep-dive analyses <span className="text-sm font-normal" style={{ color: "var(--text-dim)" }}>{data.l2Issues.length} pages</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {data.l2Issues.map((group) => {
                    const isOpen = expandedL2 === group._id;
                    const sortedIssues = [...group.issues].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
                    return (
                      <div key={group._id} className="card">
                        <button
                          onClick={() => setExpandedL2(isOpen ? null : group._id)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{shortUrl(group.url)}</p>
                            <p className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{group.url}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs" style={{ color: "var(--text-dim)" }}>{group.issues.length} issues</span>
                            <span style={{ color: "var(--text-dim)" }}>{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 flex flex-col gap-3 animate-fade">
                            {sortedIssues.map((issue, i) => {
                              const l2Key = pushKey(group.url, issue.title);
                              const l2Pushed = pushed.get(l2Key);
                              const l2IsPushing = pushingKey === l2Key;
                              return (
                                <div key={i} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                                  <div className="flex items-start gap-3 mb-2">
                                    <span
                                      className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                                      style={{
                                        background: `${severityColor(issue.severity)}18`,
                                        color: severityColor(issue.severity),
                                        border: `1px solid ${severityColor(issue.severity)}40`,
                                      }}
                                    >
                                      {severityLabel(issue.severity)}
                                    </span>
                                    <p className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{issue.title}</p>
                                  </div>
                                  <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>{issue.description}</p>
                                  {issue.location && (
                                    <p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>
                                      <span className="font-medium">Location:</span> {issue.location}
                                    </p>
                                  )}
                                  {issue.suggestedFix && (
                                    <div className="mt-2 mb-2">
                                      <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: "var(--accent)" }}>Suggested Fix</p>
                                      <p className="text-sm" style={{ color: "rgba(240,240,255,0.78)" }}>{issue.suggestedFix}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-end mt-2">
                                    {l2Pushed ? (
                                      <a
                                        href={l2Pushed.ticketUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                        style={{
                                          background: "rgba(34,197,94,0.1)",
                                          color: "var(--good)",
                                          border: "1px solid rgba(34,197,94,0.3)",
                                        }}
                                      >
                                        ✓ {l2Pushed.ticketId}
                                      </a>
                                    ) : (
                                      <button
                                        onClick={() => handlePushToJira(group.url, issue.title)}
                                        disabled={l2IsPushing}
                                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ background: "var(--accent)" }}
                                      >
                                        {l2IsPushing ? "Sending…" : "Send to Jira →"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Page breakdown */}
            {data.pageBreakdown.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {showAllPages ? "All Pages" : "Worst Performing Pages"}
                  </h2>
                  {data.pageBreakdown.length > 5 && (
                    <button
                      onClick={() => setShowAllPages((p) => !p)}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "rgba(99,102,241,0.1)" }}
                    >
                      {showAllPages ? "Show worst 5" : `Show all ${data.totalPages}`}
                    </button>
                  )}
                </div>
                {drillError && (
                  <div className="mb-3 px-4 py-2 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "var(--critical)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    {drillError}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {displayPages.map((p) => {
                    const hasL2 = l2ByUrl.has(p.url);
                    const isDrilling = drillingUrl === p.url;
                    return (
                      <div
                        key={p.url}
                        className="card flex items-center gap-3 px-4 py-3"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold tabular-nums shrink-0"
                          style={{ background: `${scoreColor(p.score)}18`, color: scoreColor(p.score), border: `1px solid ${scoreColor(p.score)}40` }}
                        >
                          {p.score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{shortUrl(p.url)}</p>
                          <p className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{p.url}</p>
                        </div>
                        {hasL2 ? (
                          <button
                            onClick={() => {
                              const group = l2ByUrl.get(p.url);
                              if (group) setExpandedL2(group._id);
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
                            style={{ color: "var(--good)", border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}
                          >
                            ✓ Deep-dive ready
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDrillDown(p.url)}
                            disabled={!!drillingUrl}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            style={{ background: "var(--accent)" }}
                          >
                            {isDrilling ? "Analyzing…" : "Deep-dive this page →"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!showAllPages && data.bestPages.length > 0 && (
                  <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--good)" }}>Best performing pages</p>
                    <div className="flex flex-col gap-1">
                      {data.bestPages.map((p) => (
                        <div key={p.url} className="flex items-center justify-between">
                          <span className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{shortUrl(p.url)}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: "var(--good)" }}>{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {findingsRanked.length === 0 && data.l2Issues.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No issues recorded for this category on this site yet.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
