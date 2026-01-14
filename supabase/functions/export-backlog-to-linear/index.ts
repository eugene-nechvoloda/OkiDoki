import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  parentId?: string;
  depth: number;
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url?: string;
}

interface ProgressEvent {
  type: "progress" | "complete" | "error";
  current?: number;
  total?: number;
  item?: string;
  identifier?: string;
  success?: boolean;
  result?: {
    success: boolean;
    createdIssues: LinearIssue[];
    totalIssues: number;
    errors: string[];
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { backlogTitle, items, teamId, projectId, guestIntegration } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Backlog items are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let LINEAR_API_KEY: string | undefined;
    let finalTeamId = teamId;
    let finalProjectId = projectId;

    // Check for guest mode (integration details in payload)
    if (guestIntegration?.api_key) {
      console.log("Using guest integration from payload");
      LINEAR_API_KEY = guestIntegration.api_key;
      finalTeamId = teamId || guestIntegration.team_id;
      finalProjectId = projectId || guestIntegration.project_id;
    } else {
      // Authenticated mode - fetch from database
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, supabaseKey);

      const authHeader = req.headers.get("Authorization");
      if (!authHeader || authHeader.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6")) {
        return new Response(
          JSON.stringify({ error: "Linear integration required. Please connect Linear first or provide guest integration." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: integration, error: integrationError } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "linear")
        .eq("status", "connected")
        .single();

      if (integrationError || !integration) {
        return new Response(
          JSON.stringify({ error: "Linear integration not found. Please connect Linear first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const config = integration.config_json as Record<string, unknown>;
      LINEAR_API_KEY = config?.api_key as string | undefined;
      finalTeamId = teamId || config.team_id;
      finalProjectId = projectId || config.project_id;
    }

    if (!LINEAR_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Linear API key not found in integration config." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!finalTeamId) {
      return new Response(
        JSON.stringify({ error: "Linear team ID is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Exporting backlog "${backlogTitle}" with ${items.length} items to Linear...`);

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (event: ProgressEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          const result = await exportBacklogToLinearWithProgress({
            apiKey: LINEAR_API_KEY!,
            teamId: finalTeamId,
            projectId: finalProjectId,
            backlogTitle,
            items,
            onProgress: sendEvent,
          });

          sendEvent({
            type: "complete",
            result,
          });
        } catch (error) {
          sendEvent({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error exporting backlog to Linear:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Export backlog items to Linear with progress callbacks
 */
async function exportBacklogToLinearWithProgress(options: {
  apiKey: string;
  teamId: string;
  projectId?: string;
  backlogTitle: string;
  items: BacklogItem[];
  onProgress: (event: ProgressEvent) => void;
}) {
  const { apiKey, teamId, projectId, items, onProgress } = options;

  const result = {
    success: false,
    createdIssues: [] as LinearIssue[],
    totalIssues: 0,
    errors: [] as string[],
  };

  // Map backlog item IDs to Linear issue IDs
  const itemToIssueMap = new Map<string, string>();

  // Sort items by depth to ensure parents are created before children
  const sortedItems = [...items].sort((a, b) => a.depth - b.depth);
  const total = sortedItems.length;

  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    
    // Send progress event
    onProgress({
      type: "progress",
      current: i + 1,
      total,
      item: item.title,
    });

    try {
      // Build description with requirements
      let description = item.description || "";
      if (item.requirements && item.requirements.length > 0) {
        description += "\n\n**Requirements:**\n" + item.requirements.map(r => `- ${r}`).join("\n");
      }

      // Find Linear parent ID if this item has a parent
      let parentId: string | undefined;
      if (item.parentId) {
        parentId = itemToIssueMap.get(item.parentId);
      }

      // Determine priority based on depth (higher priority for top-level items)
      const priority = item.depth === 0 ? 1 : item.depth === 1 ? 2 : 3;

      // Create issue via GraphQL
      const issue = await createLinearIssue(apiKey, {
        teamId,
        title: item.title,
        description,
        projectId,
        priority,
        parentId,
      });

      if (issue) {
        itemToIssueMap.set(item.id, issue.id);
        result.createdIssues.push(issue);
        
        // Send success progress
        onProgress({
          type: "progress",
          current: i + 1,
          total,
          item: item.title,
          identifier: issue.identifier,
          success: true,
        });
      }
    } catch (error) {
      const errorMsg = `Failed to create "${item.title}": ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  result.totalIssues = result.createdIssues.length;
  result.success = result.errors.length === 0 && result.createdIssues.length > 0;

  return result;
}

/**
 * Create a single Linear issue via GraphQL API
 */
async function createLinearIssue(
  apiKey: string,
  input: {
    teamId: string;
    title: string;
    description?: string;
    projectId?: string;
    priority?: number;
    parentId?: string;
  }
): Promise<LinearIssue | null> {
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

  const variables = {
    input: {
      teamId: input.teamId,
      title: input.title,
      description: input.description,
      projectId: input.projectId || undefined,
      priority: input.priority,
      parentId: input.parentId || undefined,
    },
  };

  // Remove undefined values
  Object.keys(variables.input).forEach(key => {
    if (variables.input[key as keyof typeof variables.input] === undefined) {
      delete variables.input[key as keyof typeof variables.input];
    }
  });

  const token = apiKey.trim();
  // Linear GraphQL expects personal API keys (lin_api_*) WITHOUT the Bearer prefix.
  // OAuth access tokens should remain Bearer tokens.
  const bareToken = token.toLowerCase().startsWith("bearer ") ? token.slice(7).trim() : token;
  const authHeader = bareToken.startsWith("lin_api_") ? bareToken : `Bearer ${bareToken}`;

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Linear API error: ${response.status}${errorText ? ` - ${errorText}` : ""}`
    );
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message);
  }

  if (!data.data?.issueCreate?.success) {
    throw new Error("Failed to create issue");
  }

  return data.data.issueCreate.issue;
}
