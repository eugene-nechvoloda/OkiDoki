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
  const apiKey = config?.api_key || Deno.env.get("NAPKIN_API_KEY");

  if (!apiKey) {
    throw new Error("Napkin AI API key not configured. Please connect Napkin AI in Integrations settings.");
  }

  // Determine diagram type based on content analysis
  const diagramType = suggestDiagramType(content);

  // Extract context for better diagram generation
  const context = extractDiagramContext(content);
  const goal = "Visualize this Product Requirements Document with a clear, professional diagram";

  console.log(`Generating Napkin diagram: type=${diagramType}`);

  // Build the prompt
  let prompt = content;
  if (goal) {
    prompt = `Goal: ${goal}\n\n${prompt}`;
  }
  if (context) {
    prompt = `Context: ${context}\n\n${prompt}`;
  }

  // Add diagram type guidance
  const typeInstructions: Record<string, string> = {
    "flowchart": "Create a flowchart diagram showing decision points and process flow.",
    "workflow": "Create a workflow diagram showing sequential steps and transitions.",
    "data-flow": "Create a data flow diagram showing how data moves through the system.",
    "erd": "Create an entity-relationship diagram showing database schema and relationships.",
    "mind-map": "Create a mind map showing concepts and their hierarchical relationships.",
    "business-framework": "Create a business framework diagram showing strategic components.",
    "process-map": "Create a process map showing detailed operational steps.",
  };

  if (diagramType !== "auto" && typeInstructions[diagramType]) {
    prompt = `${typeInstructions[diagramType]}\n\n${prompt}`;
  }

  try {
    // Call Napkin AI API
    const napkinResponse = await fetch("https://api.napkin.ai/v1/diagrams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        title: title,
        style: "professional",
        format: "png",
        options: {
          diagramType: diagramType === "auto" ? undefined : diagramType,
        },
      }),
    });

    if (!napkinResponse.ok) {
      const errorText = await napkinResponse.text();
      throw new Error(`Napkin AI API error: ${napkinResponse.status} - ${errorText}`);
    }

    const napkinData = await napkinResponse.json();

    return {
      success: true,
      message: "Diagram generated successfully with Napkin AI",
      url: napkinData.url || napkinData.diagramUrl,
      imageUrl: napkinData.imageUrl || napkinData.exportUrl,
    };
  } catch (error) {
    console.error("Napkin export error:", error);
    throw error;
  }
}

// Helper function to suggest diagram type based on content
function suggestDiagramType(content: string): string {
  const lower = content.toLowerCase();

  if (
    lower.includes("database") ||
    lower.includes("schema") ||
    lower.includes("entity") ||
    lower.includes("table")
  ) {
    return "erd";
  }

  if (
    lower.includes("workflow") ||
    lower.includes("process") ||
    lower.includes("step") ||
    lower.includes("approval")
  ) {
    return "workflow";
  }

  if (
    lower.includes("data flow") ||
    lower.includes("api") ||
    lower.includes("integration")
  ) {
    return "data-flow";
  }

  if (
    lower.includes("decision") ||
    lower.includes("condition") ||
    lower.includes("if ")
  ) {
    return "flowchart";
  }

  if (
    lower.includes("concept") ||
    lower.includes("hierarchy")
  ) {
    return "mind-map";
  }

  if (
    lower.includes("framework") ||
    lower.includes("strategy")
  ) {
    return "business-framework";
  }

  return "auto";
}

// Helper function to extract context
function extractDiagramContext(content: string): string {
  const lines = content.split("\n");
  const contextLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      contextLines.push(trimmed);
    }
    if (contextLines.length >= 10) break;
  }

  return contextLines.join("\n").substring(0, 500);
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
