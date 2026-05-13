"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RecentScan = {
  _id: string;
  domain: string | null;
  status: string;
  overallScore: number | null;
  grade: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function gradeColor(grade: string) {
  if (grade === "A") return "var(--good)";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "var(--attention)";
  return "var(--critical)";
}

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [compareUrl, setCompareUrl] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  useEffect(() => {
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data: RecentScan[]) => setRecentScans(data.slice(0, 5)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let normalized = url.trim();
    if (!normalized.startsWith("http")) normalized = `https://${normalized}`;

    try { new URL(normalized); } catch {
      setError("Please enter a valid URL.");
      return;
    }

    let normalizedCompare = "";
    if (showCompare && compareUrl.trim()) {
      normalizedCompare = compareUrl.trim();
      if (!normalizedCompare.startsWith("http")) normalizedCompare = `https://${normalizedCompare}`;
      try { new URL(normalizedCompare); } catch {
        setError("Please enter a valid compare URL.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, ...(normalizedCompare ? { compareUrl: normalizedCompare } : {}) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to start scan");
      const { scanId } = await res.json();
      router.push(`/dashboard/${scanId}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>GosCheck</span>
          </div>
          <p className="text-sm font-medium tracking-widest uppercase" style={{ color: "var(--accent)" }}>
            Website Intelligence Platform
          </p>
        </div>

        {/* Headline */}
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight leading-tight mb-4" style={{ color: "var(--text)" }}>
            Know exactly what's<br />
            <span style={{ color: "var(--accent)" }}>holding your site back</span>
          </h1>
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>
            AI-powered audit across 8 quality dimensions. Enter any public URL — results in minutes.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              disabled={loading}
              className="input-glow flex-1 px-5 py-4 rounded-xl text-base disabled:opacity-50 transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-8 py-4 rounded-xl font-semibold text-base text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: loading ? "var(--surface2)" : "var(--accent)",
                boxShadow: loading ? "none" : "0 0 20px var(--accent-glow)",
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {showCompare ? "Starting both…" : "Starting..."}
                </span>
              ) : showCompare ? "Compare →" : "Analyze →"}
            </button>
          </div>

          {/* Compare toggle + input */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setShowCompare((v) => !v); setCompareUrl(""); }}
              className="flex items-center gap-2 text-xs self-start px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: showCompare ? "rgba(99,102,241,0.15)" : "var(--surface)",
                border: `1px solid ${showCompare ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                color: showCompare ? "var(--accent)" : "var(--text-dim)",
              }}
            >
              <span>{showCompare ? "✕ Remove comparison" : "+ Compare against a competitor"}</span>
            </button>

            {showCompare && (
              <input
                type="text"
                value={compareUrl}
                onChange={(e) => setCompareUrl(e.target.value)}
                placeholder="https://competitor.com"
                disabled={loading}
                className="input-glow w-full px-5 py-4 rounded-xl text-base disabled:opacity-50 transition-all"
                style={{ background: "var(--surface)", border: "1px solid rgba(99,102,241,0.3)", color: "var(--text)" }}
              />
            )}
          </div>

          {error && (
            <p className="text-sm px-1" style={{ color: "var(--critical)" }}>{error}</p>
          )}
        </form>

        {/* Dimension pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {["SEO", "Content Quality", "Grammar", "Technical Health", "Accessibility", "UX", "Design", "Brand"].map((d) => (
            <span key={d} className="text-xs px-3 py-1 rounded-full mono"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
              {d}
            </span>
          ))}
        </div>

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <div className="w-full animate-fade">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--text-dim)" }}>
                Recent Scans
              </p>
              <Link href="/dashboard" className="text-xs" style={{ color: "var(--accent)" }}>
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {recentScans.map((scan) => (
                <Link
                  key={scan._id}
                  href={`/dashboard/${scan._id}`}
                  className="card-hover flex items-center justify-between px-4 py-3 gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {scan.grade ? (
                      <span className="text-sm font-black w-6 text-center shrink-0" style={{ color: gradeColor(scan.grade) }}>
                        {scan.grade}
                      </span>
                    ) : (
                      <div className="w-6 h-4 flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                      </div>
                    )}
                    <span className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                      {scan.domain ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {scan.overallScore !== null && (
                      <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-dim)" }}>
                        {scan.overallScore}/100
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>{timeAgo(scan.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
