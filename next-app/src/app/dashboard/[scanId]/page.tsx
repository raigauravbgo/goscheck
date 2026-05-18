"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import HeroSummary from "@/components/HeroSummary";
import ScorecardGrid from "@/components/ScorecardGrid";
import IssueBacklog from "@/components/IssueBacklog";
import FindingDrawer from "@/components/FindingDrawer";
import ScanHistory from "@/components/ScanHistory";
import ScanFeed from "@/components/ScanFeed";
import type { IScan } from "@/models/Scan";
import type { ISiteSummary } from "@/models/SiteSummary";
import type { IFinding } from "@/models/Finding";

type ScanDetail = {
  scan: IScan & { _id: string; errorReason?: string | null; failedAtStage?: string | null };
  site: { _id: string; domain: string; name: string } | null;
  summary: (ISiteSummary & { _id: string }) | null;
  findings: (IFinding & { _id: string })[];
  pageResults: { _id: string; url: string }[];
};

function FailedScanPanel({
  scan,
  site,
}: {
  scan: IScan & { _id: string; errorReason?: string | null; failedAtStage?: string | null };
  site: { domain: string } | null;
}) {
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const handleResume = async () => {
    setResuming(true);
    setResumeError(null);
    try {
      const res = await fetch(`/api/scans/${scan._id}/resume`, { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Resume failed");
      window.location.reload();
    } catch (e) {
      setResumeError((e as Error).message);
      setResuming(false);
    }
  };

  return (
    <div className="card p-8 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚠️</span>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Scan failed</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {site?.domain ?? "Site"} · {scan.pagesCrawled ?? 0} pages crawled before failure
            {scan.failedAtStage ? ` · failed at stage: ${scan.failedAtStage}` : ""}
          </p>
        </div>
      </div>

      {scan.errorReason ? (
        <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--critical)" }}>Error</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "rgba(240,240,255,0.78)" }}>{scan.errorReason}</p>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          No error message was recorded for this scan (it failed before the pipeline could capture one).
        </p>
      )}

      {resumeError && (
        <p className="text-sm" style={{ color: "var(--critical)" }}>{resumeError}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleResume}
          disabled={resuming}
          className="text-sm px-5 py-2 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)", boxShadow: "0 0 12px var(--accent-glow)" }}
        >
          {resuming ? "Resuming…" : "Resume scan →"}
        </button>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          Clears existing partial data for this scan and restarts the full pipeline from crawl.
        </p>
      </div>
    </div>
  );
}

export default function ScanDetailPage() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;

  const [data, setData] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<(IFinding & { _id: string }) | null>(null);
  const [tab, setTab] = useState<"overview" | "history">("overview");

  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`);
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load scan");
        const fresh = (await res.json()) as ScanDetail;
        if (cancelled) return;
        setData(fresh);
        setError(null);

        const status = fresh.scan?.status;
        if (status === "pending" || status === "running") {
          timer = setTimeout(load, 3000);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  const handleToggleFixed = useCallback(
    async (f: IFinding & { _id: string }) => {
      const nextStatus: "fixed" | "open" = f.status === "fixed" ? "open" : "fixed";

      const applyStatus = (status: "fixed" | "open") => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                findings: prev.findings.map((x) =>
                  x._id === f._id ? ({ ...(x as object), status } as IFinding & { _id: string }) : x
                ),
              }
            : prev
        );
        setSelectedFinding((cur) =>
          cur && cur._id === f._id ? ({ ...(cur as object), status } as IFinding & { _id: string }) : cur
        );
      };

      applyStatus(nextStatus);

      try {
        const res = await fetch(`/api/findings/${f._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
      } catch {
        applyStatus(f.status);
      }
    },
    []
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(7,7,15,0.8)", backdropFilter: "blur(12px)" }}
        className="sticky top-0 z-30"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            ← All scans
          </Link>
          <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>Home</Link>
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
            <p className="text-lg font-semibold mb-1" style={{ color: "var(--critical)" }}>Could not load scan</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="flex items-center gap-1 self-start p-1 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {(["overview", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="text-sm px-4 py-1.5 rounded-lg font-medium transition-all capitalize"
                  style={{
                    background: tab === t ? "var(--accent)" : "transparent",
                    color: tab === t ? "white" : "var(--text-muted)",
                    boxShadow: tab === t ? "0 0 12px var(--accent-glow)" : "none",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <>
                {data.scan.status === "failed" ? (
                  <FailedScanPanel scan={data.scan} site={data.site} />
                ) : (data.scan.status === "pending" || data.scan.status === "running") ? (
                  <div className="card p-6">
                    <ScanFeed
                      progressLog={data.scan.progressLog ?? []}
                      totalPages={data.scan.pagesCrawled ?? 0}
                      currentStage={data.scan.currentStage ?? "queued"}
                      siteUrl={data.site?.domain ?? ""}
                    />
                  </div>
                ) : (
                  <>
                    <HeroSummary
                      scan={data.scan}
                      summary={data.summary}
                      siteUrl={data.site?.domain}
                    />

                    {data.summary?.dimensionScores && (
                      <ScorecardGrid
                        scanId={data.scan._id}
                        dimensionScores={data.summary.dimensionScores as Record<string, { score: number; weight: number }>}
                      />
                    )}

                    <IssueBacklog
                      findings={data.findings}
                      activeDimension={null}
                      onSelectFinding={setSelectedFinding}
                      onToggleFixed={handleToggleFixed}
                    />

                    <FindingDrawer
                      finding={selectedFinding}
                      onClose={() => setSelectedFinding(null)}
                      onToggleFixed={handleToggleFixed}
                    />
                  </>
                )}
              </>
            )}

            {tab === "history" && data.site && (
              <ScanHistory
                domain={data.site.domain}
                currentScanId={data.scan._id}
                siteUrl={data.site.domain}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
