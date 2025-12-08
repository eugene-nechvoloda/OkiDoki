import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const url = new URL(req.url);
    const documentId = url.searchParams.get("documentId");
    const projectId = url.searchParams.get("projectId");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const search = url.searchParams.get("search");

    if (documentId) {
      // Get specific document
      const { data: document, error: docError } = await supabase
        .from("prd_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (docError) {
        return new Response(JSON.stringify({ error: docError.message }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user has access to this document
      if (
        document.owner_id !== user.id &&
        document.visibility !== "public"
      ) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ document }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Get all documents for user
      let query = supabase
        .from("prd_documents")
        .select("*")
        .eq("owner_id", user.id);

      // Apply filters
      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      // Apply search if provided
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,content_markdown.ilike.%${search}%`
        );
      }

      // Apply pagination and sorting
      const { data: documents, error: docsError } = await query
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (docsError) {
        return new Response(JSON.stringify({ error: docsError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ documents: documents || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
