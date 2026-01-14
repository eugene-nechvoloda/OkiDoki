import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileType = file.type.toLowerCase();
    let text = "";

    if (fileType === "text/plain" || fileType === "text/csv") {
      text = await file.text();
    } else if (fileType === "application/pdf") {
      text = await parsePDF(file);
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      text = await parseWord(file);
    } else {
      // Try to read as text
      try {
        text = await file.text();
      } catch {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: ${fileType}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ text, fileType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Parse failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse PDF file (simplified extraction)
 */
async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const text = new TextDecoder().decode(bytes);

  // Very basic PDF text extraction
  // In production, use a proper PDF library
  const textMatches = text.match(/\(([^)]+)\)/g);
  if (textMatches) {
    return textMatches
      .map((m) => m.slice(1, -1))
      .join(" ")
      .replace(/\\n/g, "\n");
  }

  return "PDF content (basic extraction)";
}

/**
 * Parse Word document (simplified extraction)
 */
async function parseWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // For .docx files, they are ZIP archives containing XML
  // This is a simplified approach
  // In production, use a proper Word parsing library

  try {
    const text = new TextDecoder().decode(arrayBuffer);
    // Extract text between XML tags
    const textMatches = text.match(/>([^<]+)</g);
    if (textMatches) {
      return textMatches
        .map((m) => m.slice(1, -1).trim())
        .filter((t) => t.length > 0)
        .join(" ");
    }
  } catch (error) {
    console.error("Word parsing error:", error);
  }

  return "Word document content (basic extraction)";
}
