/**
 * Linear API Service
 * Handles all Linear GraphQL API interactions
 */

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  state: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  description?: string;
}

export interface LinearWorkspace {
  id: string;
  name: string;
  urlKey: string;
}

/**
 * Fetch teams from Linear workspace
 */
export async function fetchLinearTeams(apiKey: string): Promise<LinearTeam[]> {
  const query = `
    query Teams {
      teams {
        nodes {
          id
          name
          key
          description
        }
      }
    }
  `;

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "Failed to fetch Linear teams");
  }

  return result.data?.teams?.nodes || [];
}

/**
 * Fetch projects from a specific Linear team
 */
export async function fetchLinearProjects(
  apiKey: string,
  teamId?: string
): Promise<LinearProject[]> {
  const query = teamId
    ? `
      query TeamProjects($teamId: String!) {
        team(id: $teamId) {
          projects {
            nodes {
              id
              name
              description
              state
            }
          }
        }
      }
    `
    : `
      query AllProjects {
        projects {
          nodes {
            id
            name
            description
            state
          }
        }
      }
    `;

  const variables = teamId ? { teamId } : {};

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "Failed to fetch Linear projects");
  }

  if (teamId) {
    return result.data?.team?.projects?.nodes || [];
  }

  return result.data?.projects?.nodes || [];
}

/**
 * Fetch Linear workspace info
 */
export async function fetchLinearWorkspace(apiKey: string): Promise<LinearWorkspace> {
  const query = `
    query Viewer {
      viewer {
        organization {
          id
          name
          urlKey
        }
      }
    }
  `;

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "Failed to fetch workspace");
  }

  return result.data?.viewer?.organization || { id: "", name: "Unknown", urlKey: "" };
}

/**
 * Create an issue in Linear
 */
export async function createLinearIssue(
  apiKey: string,
  params: {
    teamId: string;
    title: string;
    description: string;
    projectId?: string;
    priority?: number;
    labels?: string[];
  }
): Promise<LinearIssue> {
  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
          description
        }
      }
    }
  `;

  const input: any = {
    teamId: params.teamId,
    title: params.title,
    description: params.description,
  };

  if (params.projectId) {
    input.projectId = params.projectId;
  }

  if (params.priority !== undefined) {
    input.priority = params.priority;
  }

  if (params.labels && params.labels.length > 0) {
    input.labelIds = params.labels;
  }

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
    },
    body: JSON.stringify({
      query: mutation,
      variables: { input },
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "Failed to create Linear issue");
  }

  if (!result.data?.issueCreate?.success) {
    throw new Error("Failed to create Linear issue");
  }

  return result.data.issueCreate.issue;
}

/**
 * Validate Linear API key
 */
export async function validateLinearApiKey(apiKey: string): Promise<boolean> {
  try {
    await fetchLinearWorkspace(apiKey);
    return true;
  } catch {
    return false;
  }
}
