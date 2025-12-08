import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentRequest {
  documentId?: string;
  title: string;
  contentMarkdown?: string;
  contentJson?: any;
  status?: "draft" | "final" | "archived";
  visibility?: "private" | "public";
  projectId?: string;
  templateId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      documentId,
      title,
      contentMarkdown,
      contentJson,
      status,
      visibility,
      projectId,
      templateId,
    }: DocumentRequest = await req.json();

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let document;

    if (documentId) {
      // Update existing document
      const { data, error } = await supabase
        .from("prd_documents")
        .update({
          title,
          content_markdown: contentMarkdown,
          content_json: contentJson,
          status: status || "draft",
          visibility: visibility || "private",
          project_id: projectId,
          template_id: templateId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("owner_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating document:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      document = data;
    } else {
      // Create new document
      const { data, error } = await supabase
        .from("prd_documents")
        .insert({
          owner_id: user.id,
          title,
          content_markdown: contentMarkdown,
          content_json: contentJson,
          status: status || "draft",
          visibility: visibility || "private",
          project_id: projectId,
          template_id: templateId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating document:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      document = data;

      // Track usage for new document generation
      await supabase.from("usage_tracking").insert({
        user_id: user.id,
        action_type: "prd_generation",
        metadata_json: { document_id: document.id, template_id: templateId },
      });
    }

    return new Response(JSON.stringify({ document }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
