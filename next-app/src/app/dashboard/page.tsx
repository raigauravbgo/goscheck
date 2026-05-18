"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ScanRow = {
  _id: string;
  domain: string | null;
  status: "pending" | "running" | "complete" | "failed";
  overallScore?: number;
  grade?: string;
  pagesCrawled: number;
  createdAt: string;
  completedAt?: string;
  errorReason?: string | null;
  failedAtStage?: string | null;
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

function statusBadge(status: string) {
  if (status === "complete") return { label: "Complete", bg: "rgba(34,197,94,0.1)", color: "var(--good)", border: "rgba(34,197,94,0.25)" };
  if (status === "running") return { label: "Running", bg: "rgba(99,102,241,0.1)", color: "var(--accent)", border: "rgba(99,102,241,0.3)" };
  if (status === "pending") return { label: "Queued", bg: "rgba(234,179,8,0.1)", color: "var(--attention)", border: "rgba(234,179,8,0.25)" };
  return { label: "Failed", bg: "rgba(239,68,68,0.1)", color: "var(--critical)", border: "rgba(239,68,68,0.25)" };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardIndexPage() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadScans = () =>
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data: ScanRow[]) => setScans(data))
      .catch(console.error);

  useEffect(() => {
    loadScans().finally(() => setLoading(false));
  }, []);

  const handleCancel = async (e: React.MouseEvent, scanId: string) => {
    e.preventDefault();
    if (!confirm("Cancel this scan?")) return;
    setCancelling(scanId);
    await fetch(`/api/scans/${scanId}/cancel`, { method: "POST" });
    setCancelling(null);
    await loadScans();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(7,7,15,0.8)", backdropFilter: "blur(12px)" }}
        className="sticky top-0 z-30"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>GosCheck</span>
          </Link>

          <Link
            href="/"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold text-white"
            style={{ background: "var(--accent)", boxShadow: "0 0 12px var(--accent-glow)" }}
          >
            + New Scan
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Recent Scans</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {scans.length > 0 ? `${scans.length} scan${scans.length !== 1 ? "s" : ""} found` : ""}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loading && scans.length === 0 && (
          <div className="card p-16 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>No scans yet</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Run your first website audit to see results here.
            </p>
            <Link
              href="/"
              className="inline-block text-sm px-5 py-2.5 rounded-lg font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Start a scan →
            </Link>
          </div>
        )}

        {!loading && scans.length > 0 && (
          <div className="flex flex-col gap-3">
            {scans.map((scan) => {
              const badge = statusBadge(scan.status);
              const isClickable = scan.status === "complete" || scan.status === "running" || scan.status === "pending" || scan.status === "failed";

              return (
                <Link
                  key={scan._id}
                  href={`/dashboard/${scan._id}`}
                  className="card-hover flex items-center gap-4 px-5 py-4 transition-all animate-fade"
                  style={{ pointerEvents: isClickable ? "auto" : "none" }}
                >
                  {/* Domain + score */}
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    {/* Grade or spinner */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: scan.grade ? `${gradeColor(scan.grade)}18` : "var(--surface2)",
                        border: `1px solid ${scan.grade ? `${gradeColor(scan.grade)}40` : "var(--border)"}`,
                      }}>
                      {scan.status === "complete" && scan.grade ? (
                        <span className="text-base font-black" style={{ color: gradeColor(scan.grade) }}>{scan.grade}</span>
                      ) : scan.status === "failed" ? (
                        <span className="text-base">⚠️</span>
                      ) : (
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                        {scan.domain ?? "Unknown site"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                        {scan.pagesCrawled > 0 ? `${scan.pagesCrawled} pages` : "—"}
                        {" · "}
                        {timeAgo(scan.createdAt)}
                        {scan.status === "failed" && scan.failedAtStage ? ` · failed at ${scan.failedAtStage}` : ""}
                      </p>
                      {scan.status === "failed" && scan.errorReason && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--critical)" }}>
                          {scan.errorReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  {scan.status === "complete" && scan.overallScore !== undefined && (
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black tabular-nums" style={{ color: scoreColor(scan.overallScore) }}>
                        {scan.overallScore}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-dim)" }}>/ 100</p>
                    </div>
                  )}

                  {/* Status badge */}
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                  >
                    {badge.label}
                  </span>

                  {/* Cancel button for running/pending */}
                  {(scan.status === "running" || scan.status === "pending") && (
                    <button
                      onClick={(e) => handleCancel(e, scan._id)}
                      disabled={cancelling === scan._id}
                      className="text-xs px-2.5 py-1 rounded-lg shrink-0 transition-colors disabled:opacity-50"
                      style={{ border: "1px solid rgba(239,68,68,0.4)", color: "var(--critical)" }}
                    >
                      {cancelling === scan._id ? "…" : "Cancel"}
                    </button>
                  )}

                  {/* Arrow */}
                  <span className="text-base shrink-0" style={{ color: "var(--text-dim)" }}>→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
