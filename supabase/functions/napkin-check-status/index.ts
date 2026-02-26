import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusRequest {
  jobId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json() as StatusRequest;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "Job ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Napkin AI API key
    const authHeader = req.headers.get("Authorization");
    let napkinApiKey = Deno.env.get("NAPKIN_API_KEY");

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
        JSON.stringify({ error: "Napkin AI API key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status with Napkin AI API
    const napkinResponse = await fetch(`https://api.napkin.ai/v1/diagrams/${jobId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${napkinApiKey}`,
      },
    });

    if (!napkinResponse.ok) {
      const errorText = await napkinResponse.text();
      console.error("Napkin status check error:", napkinResponse.status, errorText);

      return new Response(
        JSON.stringify({
          error: `Napkin AI API error: ${napkinResponse.status}`,
          status: "failed",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const napkinData = await napkinResponse.json();

    // Map Napkin's status to our status format
    const status = napkinData.status || "pending";
    const normalizedStatus =
      status === "complete" || status === "completed"
        ? "completed"
        : status === "processing" || status === "generating"
        ? "processing"
        : status === "failed" || status === "error"
        ? "failed"
        : "pending";

    return new Response(
      JSON.stringify({
        status: normalizedStatus,
        progress: napkinData.progress,
        diagramUrl: napkinData.url || napkinData.diagramUrl,
        imageUrl: napkinData.imageUrl || napkinData.exportUrl,
        error: napkinData.error,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to check status",
        status: "failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
