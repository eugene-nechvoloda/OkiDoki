import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedIssueNode {
  title: string;
  description: string;
  type: "epic" | "feature" | "task" | "subtask";
  priority?: number;
  children?: ParsedIssueNode[];
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
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

    const LINEAR_API_KEY = integration.credentials_encrypted;
    const config = integration.config_json as Record<string, any>;
    const finalTeamId = teamId || config.team_id;
    const finalProjectId = projectId || config.project_id;

    console.log("Starting AI-powered hierarchy export...");
    console.log("PRD Title:", title);

    // Step 1: Parse PRD structure using AI
    const structure = await parsePRDWithAI(title, content);
    console.log(`Parsed structure: ${countIssues(structure.root)} total issues`);

    // Step 2: Create issues hierarchically in Linear
    const createdIssues: LinearIssue[] = [];
    const errors: string[] = [];

    await createIssuesRecursively(
      structure.root,
      LINEAR_API_KEY,
      finalTeamId,
      finalProjectId,
      null,
      createdIssues,
      errors
    );

    console.log(`Successfully created ${createdIssues.length} issues`);

    if (errors.length > 0) {
      console.error("Encountered errors:", errors);
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `Created ${createdIssues.length} issues in Linear`,
        rootIssue: createdIssues[0],
        createdIssues,
        totalIssues: createdIssues.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error exporting to Linear:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse PRD using AI to extract hierarchical structure
 */
async function parsePRDWithAI(
  title: string,
  content: string
): Promise<{ root: ParsedIssueNode }> {
  const prompt = `Analyze this Product Requirements Document and extract a hierarchical issue structure suitable for Linear.

PRD Title: ${title}

PRD Content:
${content}

Extract the structure following these rules:
1. Create a root epic for the main feature/product
2. Identify major features as child issues (type: "feature")
3. Break down features into tasks (type: "task")
4. Break down complex tasks into subtasks if needed (type: "subtask")
5. Keep hierarchy reasonable (max 3-4 levels deep)
6. Extract clear, actionable titles (keep them concise, under 100 chars)
7. Include relevant context in descriptions (but keep descriptions focused)
8. Assign priorities: 1=urgent, 2=high, 3=normal, 4=low

Return ONLY a JSON object with this exact structure:
{
  "root": {
    "title": "Main epic title",
    "description": "Epic description",
    "type": "epic",
    "priority": 2,
    "children": [
      {
        "title": "Feature title",
        "description": "Feature description",
        "type": "feature",
        "priority": 2,
        "children": [
          {
            "title": "Task title",
            "description": "Task description",
            "type": "task",
            "priority": 3
          }
        ]
      }
    ]
  }
}

Return ONLY the JSON, no markdown code blocks, no explanation.`;

  try {
    // Get Anthropic API key from environment
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.warn("ANTHROPIC_API_KEY not set, using fallback structure");
      return createFallbackStructure(title, content);
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
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", await response.text());
      return createFallbackStructure(title, content);
    }

    const result = await response.json();
    const aiContent = result.content[0].text;

    // Clean up response (remove markdown code blocks if present)
    const cleaned = aiContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return parsed;
  } catch (error) {
    console.error("AI parsing failed:", error);
    return createFallbackStructure(title, content);
  }
}

/**
 * Create fallback structure when AI parsing fails
 */
function createFallbackStructure(
  title: string,
  content: string
): { root: ParsedIssueNode } {
  return {
    root: {
      title: title,
      description: content.substring(0, 5000),
      type: "epic",
      priority: 2,
      children: [],
    },
  };
}

/**
 * Recursively create issues in Linear
 */
async function createIssuesRecursively(
  node: ParsedIssueNode,
  apiKey: string,
  teamId: string,
  projectId: string | undefined,
  parentId: string | null,
  createdIssues: LinearIssue[],
  errors: string[]
): Promise<void> {
  try {
    // Create current issue
    const input: Record<string, any> = {
      teamId,
      title: node.title,
      description: node.description,
    };

    if (projectId) {
      input.projectId = projectId;
    }

    if (node.priority) {
      input.priority = node.priority;
    }

    if (parentId) {
      input.parentId = parentId;
    }

    const mutation = `
      mutation IssueCreate($input: IssueCreateInput!) {
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

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({ query: mutation, variables: { input } }),
    });

    const result = await response.json();

    if (result.errors) {
      const error = `Failed to create "${node.title}": ${result.errors[0]?.message}`;
      errors.push(error);
      console.error(error);
      return;
    }

    if (!result.data?.issueCreate?.success) {
      const error = `Failed to create "${node.title}"`;
      errors.push(error);
      console.error(error);
      return;
    }

    const issue = result.data.issueCreate.issue;
    createdIssues.push(issue);
    console.log(
      `✓ Created ${node.type}: ${issue.identifier} - ${issue.title}${parentId ? ` (child of ${parentId})` : ""}`
    );

    // Create children with this issue as parent
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await createIssuesRecursively(
          child,
          apiKey,
          teamId,
          projectId,
          issue.id,
          createdIssues,
          errors
        );
      }
    }
  } catch (error) {
    const errorMsg = `Exception creating "${node.title}": ${error instanceof Error ? error.message : "Unknown error"}`;
    errors.push(errorMsg);
    console.error(errorMsg);
  }
}

/**
 * Count total issues in tree
 */
function countIssues(node: ParsedIssueNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countIssues(child);
    }
  }
  return count;
}
