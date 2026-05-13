import type { LinearCredentials } from "@/models/Integration";

const LINEAR_API = "https://api.linear.app/graphql";

interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

interface LinearIssueResult {
  ticketId: string;
  ticketUrl: string;
  identifier: string; // e.g. "ENG-123"
}

async function graphql<T>(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Linear API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`Linear GraphQL error: ${json.errors[0].message}`);
  }
  return json.data as T;
}

export async function listLinearTeams(apiKey: string): Promise<LinearTeam[]> {
  const data = await graphql<{ teams: { nodes: LinearTeam[] } }>(apiKey, `
    query { teams { nodes { id name key } } }
  `);
  return data.teams.nodes;
}

export async function testLinearConnection(apiKey: string): Promise<{ ok: boolean; viewer?: string }> {
  try {
    const data = await graphql<{ viewer: { name: string } }>(apiKey, `
      query { viewer { name } }
    `);
    return { ok: true, viewer: data.viewer.name };
  } catch {
    return { ok: false };
  }
}

export async function createLinearIssue(
  creds: LinearCredentials,
  title: string,
  description: string,
  severity: string,
  pageUrl: string,
  suggestedFix: string
): Promise<LinearIssueResult> {
  const priorityMap: Record<string, number> = {
    critical: 1,    // Urgent
    moderate: 2,    // High
    minor: 3,       // Medium
    needs_attention: 2,
  };
  const priority = priorityMap[severity] ?? 3;

  const body = [
    `**Page:** ${pageUrl}`,
    ``,
    description,
    ``,
    `**Suggested Fix:** ${suggestedFix}`,
    ``,
    `---`,
    `*Created by [GosCheck](https://goscheck.ai) — Website Intelligence Platform*`,
  ].join("\n");

  const data = await graphql<{
    issueCreate: {
      issue: { id: string; url: string; identifier: string };
    };
  }>(creds.apiKey, `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { id url identifier }
      }
    }
  `, {
    input: {
      teamId: creds.teamId,
      title,
      description: body,
      priority,
    },
  });

  const issue = data.issueCreate.issue;
  return {
    ticketId: issue.id,
    ticketUrl: issue.url,
    identifier: issue.identifier,
  };
}
