import type { JiraCredentials } from "@/models/Integration";

interface JiraProject {
  id: string;
  key: string;
  name: string;
}

interface JiraIssueResult {
  ticketId: string;
  ticketUrl: string;
  key: string; // e.g. "PROJ-42"
}

function jiraHeaders(creds: JiraCredentials) {
  const token = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${token}`,
    "Accept": "application/json",
  };
}

function jiraBase(domain: string) {
  const d = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${d}`;
}

export async function listJiraProjects(creds: Omit<JiraCredentials, "projectKey" | "projectName">): Promise<JiraProject[]> {
  const res = await fetch(`${jiraBase(creds.domain)}/rest/api/3/project/search?maxResults=50`, {
    headers: jiraHeaders({ ...creds, projectKey: "", projectName: "" }),
  });
  if (!res.ok) throw new Error(`Jira API error: ${res.status} ${await res.text()}`);
  const json = await res.json() as { values: JiraProject[] };
  return json.values;
}

export async function testJiraConnection(creds: Omit<JiraCredentials, "projectKey" | "projectName">): Promise<{ ok: boolean; displayName?: string }> {
  try {
    const res = await fetch(`${jiraBase(creds.domain)}/rest/api/3/myself`, {
      headers: jiraHeaders({ ...creds, projectKey: "", projectName: "" }),
    });
    if (!res.ok) return { ok: false };
    const json = await res.json() as { displayName: string };
    return { ok: true, displayName: json.displayName };
  } catch {
    return { ok: false };
  }
}

export async function createJiraIssue(
  creds: JiraCredentials,
  title: string,
  description: string,
  severity: string,
  pageUrl: string,
  suggestedFix: string
): Promise<JiraIssueResult> {
  const priorityMap: Record<string, string> = {
    critical: "Highest",
    moderate: "High",
    minor: "Medium",
    needs_attention: "High",
  };
  const priority = priorityMap[severity] ?? "Medium";

  // Jira uses Atlassian Document Format (ADF) for descriptions
  const body = {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Page: ", marks: [{ type: "strong" }] },
          { type: "text", text: pageUrl },
        ],
      },
      { type: "paragraph", content: [{ type: "text", text: description }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Suggested Fix: ", marks: [{ type: "strong" }] },
          { type: "text", text: suggestedFix },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Created by GosCheck — Website Intelligence Platform", marks: [{ type: "em" }] },
        ],
      },
    ],
  };

  const res = await fetch(`${jiraBase(creds.domain)}/rest/api/3/issue`, {
    method: "POST",
    headers: jiraHeaders(creds),
    body: JSON.stringify({
      fields: {
        project: { key: creds.projectKey },
        summary: title,
        description: body,
        issuetype: { name: "Bug" },
        priority: { name: priority },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira create issue failed: ${res.status} ${text}`);
  }

  const json = await res.json() as { id: string; key: string; self: string };
  const ticketUrl = `${jiraBase(creds.domain)}/browse/${json.key}`;

  return {
    ticketId: json.id,
    ticketUrl,
    key: json.key,
  };
}
