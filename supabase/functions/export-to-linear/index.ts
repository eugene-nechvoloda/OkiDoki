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
    const { title, content, teamId } = await req.json();

    if (!title || !content) {
      console.error("Missing required fields: title or content");
      return new Response(
        JSON.stringify({ error: "Title and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LINEAR_API_KEY = Deno.env.get("LINEAR_API_KEY");
    
    if (!LINEAR_API_KEY) {
      console.error("LINEAR_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Linear API key not configured. Please add LINEAR_API_KEY to secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating Linear issue with title:", title);

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
          }
        }
      }
    `;

    const variables = {
      input: {
        teamId: teamId || "09e1bd7d-151f-4260-bf14-a24bc6457fa3", // Default team ID
        title: title,
        description: content,
      },
    };

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const result = await response.json();
    console.log("Linear API response:", JSON.stringify(result));

    if (result.errors) {
      console.error("Linear API errors:", result.errors);
      return new Response(
        JSON.stringify({ error: result.errors[0]?.message || "Failed to create Linear issue" }),
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
        issue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
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
