"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type LinearStatus = {
  connected: boolean;
  teamName?: string;
  teamId?: string;
  connectedAt?: string;
};

type JiraStatus = {
  connected: boolean;
  domain?: string;
  email?: string;
  projectKey?: string;
  projectName?: string;
  connectedAt?: string;
};

type LinearTeam = { id: string; name: string; key: string };
type JiraProject = { id: string; key: string; name: string };

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Linear state
  const [linearStatus, setLinearStatus] = useState<LinearStatus | null>(null);
  const [linearApiKey, setLinearApiKey] = useState("");
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>([]);
  const [linearSelectedTeam, setLinearSelectedTeam] = useState<LinearTeam | null>(null);
  const [linearTesting, setLinearTesting] = useState(false);
  const [linearSaving, setLinearSaving] = useState(false);
  const [linearError, setLinearError] = useState<string | null>(null);
  const [linearViewer, setLinearViewer] = useState<string | null>(null);

  // Jira state
  const [jiraStatus, setJiraStatus] = useState<JiraStatus | null>(null);
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraSelectedProject, setJiraSelectedProject] = useState<JiraProject | null>(null);
  const [jiraTesting, setJiraTesting] = useState(false);
  const [jiraSaving, setJiraSaving] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [jiraViewer, setJiraViewer] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/linear").then((r) => r.json()).then(setLinearStatus).catch(() => {});
    fetch("/api/integrations/jira").then((r) => r.json()).then(setJiraStatus).catch(() => {});
  }, []);

  // ── Linear handlers ──────────────────────────────────────────────────────────

  const testLinear = async () => {
    setLinearError(null);
    setLinearViewer(null);
    setLinearTeams([]);
    setLinearSelectedTeam(null);
    setLinearTesting(true);
    try {
      const res = await fetch("/api/integrations/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", apiKey: linearApiKey }),
      });
      const json = await res.json() as { ok?: boolean; viewer?: string; teams?: LinearTeam[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Test failed");
      setLinearViewer(json.viewer ?? null);
      setLinearTeams(json.teams ?? []);
    } catch (e) {
      setLinearError((e as Error).message);
    } finally {
      setLinearTesting(false);
    }
  };

  const saveLinear = async () => {
    if (!linearSelectedTeam) { setLinearError("Select a team first"); return; }
    setLinearSaving(true);
    setLinearError(null);
    try {
      const res = await fetch("/api/integrations/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: linearApiKey, teamId: linearSelectedTeam.id, teamName: linearSelectedTeam.name }),
      });
      const json = await res.json() as { connected?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      setLinearStatus({ connected: true, teamName: linearSelectedTeam.name, teamId: linearSelectedTeam.id });
      setLinearApiKey("");
      setLinearTeams([]);
      setLinearSelectedTeam(null);
      setLinearViewer(null);
    } catch (e) {
      setLinearError((e as Error).message);
    } finally {
      setLinearSaving(false);
    }
  };

  const disconnectLinear = async () => {
    await fetch("/api/integrations/linear", { method: "DELETE" });
    setLinearStatus({ connected: false });
  };

  // ── Jira handlers ────────────────────────────────────────────────────────────

  const testJira = async () => {
    setJiraError(null);
    setJiraViewer(null);
    setJiraProjects([]);
    setJiraSelectedProject(null);
    setJiraTesting(true);
    try {
      const res = await fetch("/api/integrations/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", email: jiraEmail, apiToken: jiraToken, domain: jiraDomain }),
      });
      const json = await res.json() as { ok?: boolean; displayName?: string; projects?: JiraProject[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Test failed");
      setJiraViewer(json.displayName ?? null);
      setJiraProjects(json.projects ?? []);
    } catch (e) {
      setJiraError((e as Error).message);
    } finally {
      setJiraTesting(false);
    }
  };

  const saveJira = async () => {
    if (!jiraSelectedProject) { setJiraError("Select a project first"); return; }
    setJiraSaving(true);
    setJiraError(null);
    try {
      const res = await fetch("/api/integrations/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: jiraEmail,
          apiToken: jiraToken,
          domain: jiraDomain,
          projectKey: jiraSelectedProject.key,
          projectName: jiraSelectedProject.name,
        }),
      });
      const json = await res.json() as { connected?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      setJiraStatus({ connected: true, domain: jiraDomain, email: jiraEmail, projectKey: jiraSelectedProject.key, projectName: jiraSelectedProject.name });
      setJiraEmail("");
      setJiraToken("");
      setJiraProjects([]);
      setJiraSelectedProject(null);
      setJiraViewer(null);
    } catch (e) {
      setJiraError((e as Error).message);
    } finally {
      setJiraSaving(false);
    }
  };

  const disconnectJira = async () => {
    await fetch("/api/integrations/jira", { method: "DELETE" });
    setJiraStatus({ connected: false });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid var(--border)", background: "rgba(7,7,15,0.8)", backdropFilter: "blur(12px)" }}
        className="sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm transition-colors" style={{ color: "var(--text-muted)" }}>
              ← Dashboard
            </Link>
            <span style={{ color: "var(--border)" }}>|</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Settings</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Integrations</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Connect your bug tracker to push issues directly from scan results.
          </p>
        </div>

        {/* Linear card */}
        <IntegrationCard
          name="Linear"
          logo="⬡"
          description="Push issues to your Linear team. Requires a Personal API Key from Linear settings."
          docsHint='Get your API key from Linear → Settings → API → "Personal API Keys"'
          connected={linearStatus?.connected ?? false}
          connectedLabel={linearStatus?.connected ? `Connected to ${linearStatus.teamName}` : undefined}
          connectedAt={linearStatus?.connectedAt}
          onDisconnect={disconnectLinear}
          error={linearError}
        >
          {!linearStatus?.connected && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Personal API Key
                </label>
                <input
                  type="password"
                  placeholder="lin_api_..."
                  value={linearApiKey}
                  onChange={(e) => setLinearApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                />
              </div>

              {linearViewer && (
                <p className="text-xs" style={{ color: "var(--good)" }}>
                  ✓ Connected as <strong>{linearViewer}</strong>
                </p>
              )}

              {linearTeams.length > 0 && (
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Select Team
                  </label>
                  <div className="flex flex-col gap-1">
                    {linearTeams.map((t) => (
                      <button key={t.id} onClick={() => setLinearSelectedTeam(t)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
                        style={{
                          background: linearSelectedTeam?.id === t.id ? "rgba(99,102,241,0.15)" : "var(--surface2)",
                          border: `1px solid ${linearSelectedTeam?.id === t.id ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                          color: "var(--text)",
                        }}>
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-dim)" }}>{t.key}</span>
                        {linearSelectedTeam?.id === t.id && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={testLinear} disabled={!linearApiKey || linearTesting}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {linearTesting ? "Testing…" : "Test Connection"}
                </button>
                {linearTeams.length > 0 && (
                  <button onClick={saveLinear} disabled={!linearSelectedTeam || linearSaving}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                    {linearSaving ? "Saving…" : "Save & Connect"}
                  </button>
                )}
              </div>
            </div>
          )}
        </IntegrationCard>

        {/* Jira card */}
        <IntegrationCard
          name="Jira"
          logo="◈"
          description="Push issues to your Jira project. Requires an Atlassian API token."
          docsHint='Get your API token from id.atlassian.com → Security → "Create and manage API tokens"'
          connected={jiraStatus?.connected ?? false}
          connectedLabel={jiraStatus?.connected ? `${jiraStatus.projectName} (${jiraStatus.projectKey}) on ${jiraStatus.domain}` : undefined}
          connectedAt={jiraStatus?.connectedAt}
          onDisconnect={disconnectJira}
          error={jiraError}
        >
          {!jiraStatus?.connected && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Atlassian Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Jira Domain
                  </label>
                  <input
                    type="text"
                    placeholder="company.atlassian.net"
                    value={jiraDomain}
                    onChange={(e) => setJiraDomain(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-dim)" }}>
                  API Token
                </label>
                <input
                  type="password"
                  placeholder="ATATT3..."
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                />
              </div>

              {jiraViewer && (
                <p className="text-xs" style={{ color: "var(--good)" }}>
                  ✓ Connected as <strong>{jiraViewer}</strong>
                </p>
              )}

              {jiraProjects.length > 0 && (
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-dim)" }}>
                    Select Project
                  </label>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {jiraProjects.map((p) => (
                      <button key={p.id} onClick={() => setJiraSelectedProject(p)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
                        style={{
                          background: jiraSelectedProject?.id === p.id ? "rgba(99,102,241,0.15)" : "var(--surface2)",
                          border: `1px solid ${jiraSelectedProject?.id === p.id ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                          color: "var(--text)",
                        }}>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-dim)" }}>{p.key}</span>
                        {jiraSelectedProject?.id === p.id && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={testJira} disabled={!jiraEmail || !jiraToken || !jiraDomain || jiraTesting}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {jiraTesting ? "Testing…" : "Test Connection"}
                </button>
                {jiraProjects.length > 0 && (
                  <button onClick={saveJira} disabled={!jiraSelectedProject || jiraSaving}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                    {jiraSaving ? "Saving…" : "Save & Connect"}
                  </button>
                )}
              </div>
            </div>
          )}
        </IntegrationCard>
      </div>
    </div>
  );
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────

function IntegrationCard({
  name,
  logo,
  description,
  docsHint,
  connected,
  connectedLabel,
  connectedAt,
  onDisconnect,
  error,
  children,
}: {
  name: string;
  logo: string;
  description: string;
  docsHint: string;
  connected: boolean;
  connectedLabel?: string;
  connectedAt?: string;
  onDisconnect: () => void;
  error: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent)" }}>
            {logo}
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>{name}</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>
          </div>
        </div>
        {connected && (
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: "rgba(34,197,94,0.1)", color: "var(--good)", border: "1px solid rgba(34,197,94,0.25)" }}>
            Connected
          </span>
        )}
      </div>

      {connected ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{connectedLabel}</p>
              {connectedAt && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                  Connected {new Date(connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button onClick={onDisconnect}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
            {docsHint}
          </p>
          {children}
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "var(--critical)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
