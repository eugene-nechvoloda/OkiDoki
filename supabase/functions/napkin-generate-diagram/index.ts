import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagramRequest {
  text: string;
  title?: string;
  diagramType?: string;
  style?: string;
  context?: string;
  goal?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      text,
      title,
      diagramType = "auto",
      style = "professional",
      context,
      goal,
    } = await req.json() as DiagramRequest;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required for diagram generation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Napkin AI API key from environment or user's integration config
    const authHeader = req.headers.get("Authorization");
    let napkinApiKey = Deno.env.get("NAPKIN_API_KEY");

    // If authenticated, try to get API key from user's integration
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: integrations } = await supabase
          .from("integrations")
          .select("config_json")
          .eq("user_id", user.id)
          .eq("provider", "napkin")
          .eq("status", "connected")
          .single();

        if (integrations?.config_json) {
          const config = integrations.config_json as Record<string, unknown>;
          napkinApiKey = config.api_key as string || napkinApiKey;
        }
      }
    }

    if (!napkinApiKey) {
      return new Response(
        JSON.stringify({
          error: "Napkin AI API key not configured. Please connect Napkin AI in Integrations settings or set NAPKIN_API_KEY environment variable."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating Napkin diagram: type=${diagramType}, style=${style}`);

    // Build the prompt for Napkin AI
    let prompt = text;

    if (goal) {
      prompt = `Goal: ${goal}\n\n${prompt}`;
    }

    if (context) {
      prompt = `Context: ${context}\n\n${prompt}`;
    }

    // Add diagram type guidance if not auto
    if (diagramType !== "auto") {
      const typeInstructions: Record<string, string> = {
        "flowchart": "Create a flowchart diagram showing decision points and process flow.",
        "workflow": "Create a workflow diagram showing sequential steps and transitions.",
        "data-flow": "Create a data flow diagram showing how data moves through the system.",
        "erd": "Create an entity-relationship diagram showing database schema and relationships.",
        "mind-map": "Create a mind map showing concepts and their hierarchical relationships.",
        "business-framework": "Create a business framework diagram showing strategic components.",
        "process-map": "Create a process map showing detailed operational steps.",
        "infographic": "Create an infographic visualizing key information and metrics.",
      };

      const instruction = typeInstructions[diagramType];
      if (instruction) {
        prompt = `${instruction}\n\n${prompt}`;
      }
    }

    // Call Napkin AI API
    // Note: This is a placeholder implementation. Actual Napkin API might differ.
    // Based on research, Napkin AI provides a REST API at api.napkin.ai
    const napkinResponse = await fetch("https://api.napkin.ai/v1/diagrams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${napkinApiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        title: title || "PRD Diagram",
        style: style,
        format: "png", // Request PNG export
        options: {
          diagramType: diagramType === "auto" ? undefined : diagramType,
        },
      }),
    });

    if (!napkinResponse.ok) {
      const errorText = await napkinResponse.text();
      console.error("Napkin API error:", napkinResponse.status, errorText);

      return new Response(
        JSON.stringify({
          error: `Napkin AI API error: ${napkinResponse.status} - ${errorText}`,
        }),
        { status: napkinResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const napkinData = await napkinResponse.json();

    console.log("Napkin diagram generated successfully");

    // Return the diagram data
    // The actual response structure depends on Napkin AI's API
    return new Response(
      JSON.stringify({
        success: true,
        diagramUrl: napkinData.url || napkinData.diagramUrl,
        imageUrl: napkinData.imageUrl || napkinData.exportUrl,
        jobId: napkinData.jobId || napkinData.id,
        message: "Diagram generated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Napkin diagram generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate diagram",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
