import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MCP_PROTOCOL_VERSION = "2025-06-18";
const LINEAR_MCP_SERVER = "https://mcp.linear.app/mcp";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, teamId, projectId } = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: "Title and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Get Linear integration
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

    // Get API key from config_json (where it's actually stored)
    const config = integration.config_json as Record<string, any>;
    const LINEAR_API_KEY = config?.api_key;
    
    if (!LINEAR_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Linear API key not found in integration config." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const finalTeamId = teamId || config.team_id;
    const finalProjectId = projectId || config.project_id;

    console.log("Starting MCP-powered export...");

    // Execute MCP-based export
    const result = await exportViaLinearMCP({
      apiKey: LINEAR_API_KEY,
      teamId: finalTeamId,
      projectId: finalProjectId,
      prdTitle: title,
      prdContent: content,
    });

    console.log("Export result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error exporting to Linear via MCP:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Export PRD via Linear MCP server
 */
async function exportViaLinearMCP(options: {
  apiKey: string;
  teamId: string;
  projectId?: string;
  prdTitle: string;
  prdContent: string;
}) {
  const { apiKey, teamId, projectId, prdTitle, prdContent } = options;

  const result = {
    success: false,
    createdIssues: [] as any[],
    totalIssues: 0,
    errors: [] as string[],
    agentLog: [] as string[],
    rootIssue: null as any,
  };

  let sessionId = crypto.randomUUID();
  let requestId = 0;

  try {
    // Helper to send MCP requests
    const sendMCPRequest = async (method: string, params: any) => {
      requestId++;
      const response = await fetch(LINEAR_MCP_SERVER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": `Bearer ${apiKey}`,
          "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: requestId,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    };

    // Step 1: Initialize MCP connection
    result.agentLog.push("Connecting to Linear MCP server...");
    const initResult = await sendMCPRequest("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      clientInfo: { name: "okidoki", version: "1.0.0" },
    });

    if (initResult.error) {
      throw new Error(`MCP initialization failed: ${initResult.error.message}`);
    }
    result.agentLog.push("✓ Connected to Linear MCP");

    // Step 2: List available tools
    result.agentLog.push("Discovering MCP tools...");
    const toolsResult = await sendMCPRequest("tools/list", {});
    if (toolsResult.error) {
      throw new Error(`Failed to list tools: ${toolsResult.error.message}`);
    }
    const tools = toolsResult.result?.tools || [];
    result.agentLog.push(`✓ Found ${tools.length} tools`);

    // Step 3: Use AI to create execution plan
    result.agentLog.push("Analyzing PRD with AI...");
    const plan = await createExecutionPlan(prdTitle, prdContent, teamId, projectId);
    result.agentLog.push(`✓ Plan created: ${plan.steps.length} issues`);

    // Step 4: Execute plan using MCP tools
    result.agentLog.push("Creating issues via MCP...");
    const stepIssueMap = new Map<number, string>(); // stepIndex -> issueId

    for (const step of plan.steps) {
      result.agentLog.push(`  Creating: ${step.title}`);

      // Resolve parent ID from step index
      const parentId = step.parentStepIndex !== null
        ? stepIssueMap.get(step.parentStepIndex)
        : undefined;

      const toolCallResult = await sendMCPRequest("tools/call", {
        name: "linear_create_issue",
        arguments: {
          teamId: step.teamId,
          title: step.title,
          description: step.description,
          projectId: step.projectId,
          priority: step.priority,
          parentId: parentId,
        },
      });

      if (toolCallResult.error) {
        const error = `Failed: ${step.title} - ${toolCallResult.error.message}`;
        result.errors.push(error);
        result.agentLog.push(`  ✗ ${error}`);
        continue;
      }

      // Parse issue from result
      const issueData = parseIssueFromMCP(toolCallResult.result);
      if (issueData) {
        result.createdIssues.push(issueData);
        stepIssueMap.set(step.stepIndex, issueData.id);
        result.agentLog.push(`  ✓ Created ${issueData.identifier}`);
      }
    }

    result.totalIssues = result.createdIssues.length;
    result.rootIssue = result.createdIssues[0];
    result.success = result.errors.length === 0;
    result.agentLog.push(`✓ Complete: ${result.totalIssues} issues created`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    result.agentLog.push(`✗ Fatal: ${errorMsg}`);
    return result;
  }
}

/**
 * Create execution plan with AI
 */
async function createExecutionPlan(
  title: string,
  content: string,
  teamId: string,
  projectId?: string
) {
  const prompt = `Analyze this PRD and create a step-by-step plan for Linear issues.

PRD: ${title}

Content:
${content}

Create a hierarchical plan:
1. Root epic first
2. Features as children
3. Tasks under features
4. Max 3-4 levels

Return JSON only:
{
  "steps": [
    {
      "title": "Epic: Name",
      "description": "Details",
      "priority": 2,
      "parentStepIndex": null,
      "stepIndex": 0
    }
  ]
}`;

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error("AI analysis failed");
  }

  const result = await response.json();
  const text = result.content[0].text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(text);

  return {
    steps: parsed.steps.map((s: any) => ({
      ...s,
      teamId,
      projectId,
    })),
  };
}

/**
 * Parse issue from MCP tool result
 */
function parseIssueFromMCP(result: any) {
  try {
    const content = result.content?.[0];
    if (!content) return null;

    // Try to extract JSON from text
    const text = content.text || content.data || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    return {
      id: data.id || data.issueId,
      identifier: data.identifier || data.key,
      title: data.title,
      url: data.url,
    };
  } catch (error) {
    console.error("Failed to parse MCP result:", error);
    return null;
  }
}
