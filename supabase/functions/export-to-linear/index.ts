import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, teamId, projectId, priority } = await req.json();

    if (!title || !content) {
      console.error("Missing required fields: title or content");
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

    // Get Linear integration for this user
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "linear")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      console.error("Linear integration not found for user");
      return new Response(
        JSON.stringify({ error: "Linear integration not found. Please connect Linear first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LINEAR_API_KEY = integration.credentials_encrypted;
    const config = integration.config_json as Record<string, any>;

    console.log("Creating Linear issue with title:", title);
    console.log("Using team:", config.team_name || "default");

    // Prepare input for issue creation
    const input: Record<string, any> = {
      teamId: teamId || config.team_id,
      title: title,
      description: content,
    };

    // Add optional fields
    if (projectId || config.project_id) {
      input.projectId = projectId || config.project_id;
    }

    if (priority !== undefined) {
      input.priority = priority;
    }

    // Create issue in Linear using GraphQL API
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
            team {
              name
              key
            }
            project {
              name
            }
          }
        }
      }
    `;

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: mutation, variables: { input } }),
    });

    const result = await response.json();
    console.log("Linear API response:", JSON.stringify(result));

    if (result.errors) {
      console.error("Linear API errors:", result.errors);
      return new Response(
        JSON.stringify({
          error: result.errors[0]?.message || "Failed to create Linear issue",
          details: result.errors
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result.data?.issueCreate?.success) {
      console.error("Linear issue creation failed");
      return new Response(
        JSON.stringify({ error: "Failed to create Linear issue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const issue = result.data.issueCreate.issue;
    console.log("Successfully created Linear issue:", issue.identifier);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created issue ${issue.identifier} in ${issue.team.name}`,
        url: issue.url,
        issue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
          team: issue.team.name,
          project: issue.project?.name,
        },
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
