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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const chatMessageId = formData.get("chatMessageId") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: "File size exceeds 10MB limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate storage path
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}_${file.name}`;

    // Upload file to storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract content based on file type
    let extractedContent = "";
    const fileType = file.type.toLowerCase();

    if (fileType.includes("pdf")) {
      // PDF extraction - use Claude vision or PDF parser
      extractedContent = await extractPdfContent(fileBuffer, file.name);
    } else if (fileType.includes("image")) {
      // Image OCR - use Claude vision
      extractedContent = await extractImageContent(fileBuffer, file.type);
    } else if (
      fileType.includes("text") ||
      fileType.includes("markdown") ||
      fileExt === "txt" ||
      fileExt === "md"
    ) {
      // Plain text files
      const textDecoder = new TextDecoder();
      extractedContent = textDecoder.decode(fileBuffer);
    } else if (
      fileType.includes("document") ||
      fileExt === "doc" ||
      fileExt === "docx"
    ) {
      // Document files - basic extraction
      extractedContent = `[Document file: ${file.name}]\nPlease describe the contents of this document.`;
    }

    // Save file attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from("file_attachments")
      .insert({
        user_id: user.id,
        chat_message_id: chatMessageId,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        storage_path: uploadData.path,
        extracted_content: extractedContent,
        metadata_json: {
          original_name: file.name,
          uploaded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (attachmentError) {
      console.error("Error saving attachment:", attachmentError);
    }

    // Track usage
    await supabase.from("usage_tracking").insert({
      user_id: user.id,
      action_type: "file_upload",
      metadata_json: {
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        file: {
          id: attachment?.id,
          name: file.name,
          type: file.type,
          size: file.size,
          storagePath: uploadData.path,
          extractedContent,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

// Helper function to extract PDF content using Claude vision
async function extractPdfContent(
  fileBuffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return `[PDF file: ${fileName}]\nCannot extract content - Anthropic API key not configured.`;
    }

    // Convert first few pages to images and use Claude vision
    // For now, return a placeholder
    return `[PDF file: ${fileName}]\nPDF content extraction is in progress. Please describe the contents.`;
  } catch (error) {
    console.error("Error extracting PDF:", error);
    return `[PDF file: ${fileName}]\nError extracting content.`;
  }
}

// Helper function to extract image content using Claude vision
async function extractImageContent(
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return "[Image attached]\nCannot extract content - Anthropic API key not configured.";
    }

    // Convert to base64
    const base64 = btoa(
      new Uint8Array(fileBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Use Claude vision to analyze the image
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Extract all text, ideas, and structured information from this image. If it's a whiteboard, Miro board, or diagram, describe the structure, sticky notes, and relationships. Format the output as clear, structured text that can be used for generating a PRD.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude vision error:", errorText);
      return "[Image attached]\nError analyzing image with AI.";
    }

    const result = await response.json();
    const extractedText = result.content[0]?.text || "[Image attached]";

    return extractedText;
  } catch (error) {
    console.error("Error extracting image content:", error);
    return "[Image attached]\nError analyzing image.";
  }
}
