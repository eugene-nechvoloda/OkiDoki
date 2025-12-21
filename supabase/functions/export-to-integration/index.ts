import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  provider: "confluence" | "linear" | "gamma" | "napkin";
  title: string;
  content: string;
  integrationConfig?: {
    api_key?: string;
    workspace_id?: string;
    workspace_name?: string;
    [key: string]: unknown;
  };
}

async function exportToLinear(title: string, content: string, config?: ExportRequest["integrationConfig"]) {
  const apiKey = config?.api_key || Deno.env.get("LINEAR_API_KEY");
  
  if (!apiKey) {
    throw new Error("Linear API key not configured. Please connect Linear in Integrations settings.");
  }

  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  // Get the first team to assign the issue
  const teamsQuery = `
    query {
      teams {
        nodes {
          id
          name
        }
      }
    }
  `;

  const teamsResponse = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: teamsQuery }),
  });

  const teamsData = await teamsResponse.json();
  
  if (teamsData.errors) {
    throw new Error(teamsData.errors[0]?.message || "Failed to fetch Linear teams");
  }

  const teamId = teamsData.data?.teams?.nodes?.[0]?.id;
  
  if (!teamId) {
    throw new Error("No Linear teams found. Please create a team in Linear first.");
  }

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          teamId,
          title: `PRD: ${title}`,
          description: content,
        },
      },
    }),
  });

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message || "Failed to create Linear issue");
  }

  const issue = data.data?.issueCreate?.issue;
  
  return {
    success: true,
    message: `Created Linear issue: ${issue?.identifier}`,
    url: issue?.url,
    issue,
  };
}

async function exportToConfluence(title: string, content: string, config?: ExportRequest["integrationConfig"]) {
  // Confluence integration placeholder
  // In production, this would use the Atlassian REST API
  if (!config?.api_key) {
    throw new Error("Confluence API key not configured. Please connect Confluence in Integrations settings.");
  }
  
  // TODO: Implement Confluence API integration
  // API docs: https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
  
  return {
    success: true,
    message: "Confluence export coming soon",
    url: null,
  };
}

async function exportToGamma(title: string, content: string, config?: ExportRequest["integrationConfig"]) {
  // Gamma integration placeholder
  if (!config?.api_key) {
    throw new Error("Gamma API key not configured. Please connect Gamma in Integrations settings.");
  }
  
  // TODO: Implement Gamma API integration
  
  return {
    success: true,
    message: "Gamma export coming soon",
    url: null,
  };
}

async function exportToNapkin(title: string, content: string, config?: ExportRequest["integrationConfig"]) {
  // Napkin AI integration placeholder
  if (!config?.api_key) {
    throw new Error("Napkin AI API key not configured. Please connect Napkin AI in Integrations settings.");
  }
  
  // TODO: Implement Napkin AI API integration
  
  return {
    success: true,
    message: "Napkin AI export coming soon",
    url: null,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, title, content, integrationConfig } = await req.json() as ExportRequest;

    if (!provider || !title || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: provider, title, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Exporting to ${provider}:`, { title, contentLength: content.length });

    let result;
    
    switch (provider) {
      case "linear":
        result = await exportToLinear(title, content, integrationConfig);
        break;
      case "confluence":
        result = await exportToConfluence(title, content, integrationConfig);
        break;
      case "gamma":
        result = await exportToGamma(title, content, integrationConfig);
        break;
      case "napkin":
        result = await exportToNapkin(title, content, integrationConfig);
        break;
      default:
        throw new Error(`Unknown integration provider: ${provider}`);
    }

    console.log(`Export to ${provider} successful:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Export failed",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
