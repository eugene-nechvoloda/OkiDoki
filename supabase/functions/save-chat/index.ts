import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  chatId?: string;
  title?: string;
  projectId?: string;
  prdDocumentId?: string;
  settings?: any;
  messages?: Array<{
    role: string;
    content: string;
    attachments?: any[];
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
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
      chatId,
      title,
      projectId,
      prdDocumentId,
      settings,
      messages,
    }: ChatRequest = await req.json();

    let chat;

    // Update existing chat or create new one
    if (chatId) {
      // Update existing chat
      const { data, error } = await supabase
        .from("chats")
        .update({
          title,
          project_id: projectId,
          prd_document_id: prdDocumentId,
          settings_json: settings || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating chat:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      chat = data;
    } else {
      // Create new chat
      const { data, error } = await supabase
        .from("chats")
        .insert({
          user_id: user.id,
          title: title || "New Chat",
          project_id: projectId,
          prd_document_id: prdDocumentId,
          settings_json: settings || {},
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating chat:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      chat = data;
    }

    // Save messages if provided
    if (messages && messages.length > 0) {
      const messageInserts = messages.map((msg) => ({
        chat_id: chat.id,
        role: msg.role,
        content: msg.content,
        attachments_json: msg.attachments || [],
      }));

      const { error: messagesError } = await supabase
        .from("chat_messages")
        .insert(messageInserts);

      if (messagesError) {
        console.error("Error saving messages:", messagesError);
        // Don't fail the whole request, just log the error
      }
    }

    // Track usage
    await supabase.from("usage_tracking").insert({
      user_id: user.id,
      action_type: "chat_message",
      metadata_json: { chat_id: chat.id, message_count: messages?.length || 0 },
    });

    return new Response(JSON.stringify({ chat }), {
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
