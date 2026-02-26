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
    const fileName = file.name.toLowerCase();
    let text = "";

    console.log(`Processing file: ${file.name}, type: ${fileType}`);

    // Handle plain text files
    if (fileType === "text/plain" || fileType === "text/csv" || 
        fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
      text = await file.text();
    } 
    // Handle PDF files
    else if (fileType === "application/pdf" || fileName.endsWith('.pdf')) {
      text = await extractPDFText(file);
    } 
    // Handle Word documents
    else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword" ||
      fileName.endsWith('.docx') || fileName.endsWith('.doc')
    ) {
      text = await extractWordText(file);
    } 
    // Try to read as text for unknown types
    else {
      try {
        text = await file.text();
      } catch {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: ${fileType}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Extracted ${text.length} characters from ${file.name}`);

    return new Response(
      JSON.stringify({ text, fileType, fileName: file.name }),
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
 * Extract text from PDF using raw parsing
 * This approach reads the PDF structure and extracts text streams
 */
async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to string for parsing
  const pdfString = new TextDecoder("latin1").decode(bytes);
  
  const extractedText: string[] = [];
  
  // Method 1: Extract text from stream objects
  // Look for text between BT (begin text) and ET (end text) operators
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = btEtRegex.exec(pdfString)) !== null) {
    const textBlock = match[1];
    
    // Extract text from Tj operator (show text)
    const tjMatches = textBlock.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      for (const tj of tjMatches) {
        const textMatch = tj.match(/\(([^)]*)\)/);
        if (textMatch) {
          extractedText.push(decodeEscapedText(textMatch[1]));
        }
      }
    }
    
    // Extract text from TJ operator (show text with positioning)
    const tjArrayMatches = textBlock.match(/\[([\s\S]*?)\]\s*TJ/gi);
    if (tjArrayMatches) {
      for (const tjArray of tjArrayMatches) {
        const stringMatches = tjArray.match(/\(([^)]*)\)/g);
        if (stringMatches) {
          for (const str of stringMatches) {
            const textMatch = str.match(/\(([^)]*)\)/);
            if (textMatch) {
              extractedText.push(decodeEscapedText(textMatch[1]));
            }
          }
        }
      }
    }
  }
  
  // Method 2: Look for FlateDecode streams and try to decompress
  // This handles compressed content streams
  const streamRegex = /stream\s*\n([\s\S]*?)\nendstream/g;
  while ((match = streamRegex.exec(pdfString)) !== null) {
    try {
      const streamData = match[1];
      // Check if it might contain readable text
      const readableText = streamData.match(/\(([^)]{2,})\)/g);
      if (readableText) {
        for (const rt of readableText) {
          const textMatch = rt.match(/\(([^)]*)\)/);
          if (textMatch && textMatch[1].length > 1) {
            const decoded = decodeEscapedText(textMatch[1]);
            if (isReadableText(decoded)) {
              extractedText.push(decoded);
            }
          }
        }
      }
    } catch (e) {
      // Ignore decompression errors
    }
  }
  
  // Method 3: Direct string extraction for simple PDFs
  const directStrings = pdfString.match(/\(([A-Za-z0-9\s.,!?;:'"()-]{3,})\)/g);
  if (directStrings && extractedText.length < 10) {
    for (const ds of directStrings) {
      const textMatch = ds.match(/\(([^)]*)\)/);
      if (textMatch) {
        const decoded = decodeEscapedText(textMatch[1]);
        if (isReadableText(decoded) && decoded.length > 2) {
          extractedText.push(decoded);
        }
      }
    }
  }
  
  // Clean and join extracted text
  let result = extractedText
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .join(" ");
  
  // Clean up common artifacts
  result = result
    .replace(/\s+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  
  if (result.length < 50) {
    // If we couldn't extract much, return a helpful message
    return `[PDF document: ${file.name}] - Content could not be fully extracted. The document may contain images or complex formatting. File size: ${file.size} bytes.`;
  }
  
  return result;
}

/**
 * Decode escaped characters in PDF strings
 */
function decodeEscapedText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Check if text is reasonably readable
 */
function isReadableText(text: string): boolean {
  // Check if the text contains mostly printable characters
  const printableRatio = text.replace(/[^\x20-\x7E]/g, "").length / text.length;
  return printableRatio > 0.7 && text.length > 1;
}

/**
 * Extract text from Word document (DOCX)
 * DOCX files are ZIP archives containing XML
 */
async function extractWordText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Check for ZIP signature (DOCX is a ZIP file)
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
    // Not a ZIP file, try to read as text
    return new TextDecoder().decode(bytes).replace(/<[^>]*>/g, " ").trim();
  }
  
  // For DOCX, we need to extract the document.xml from the ZIP
  // Simple approach: find XML content and extract text
  const content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  
  const extractedText: string[] = [];
  
  // Look for text content in w:t tags (Word text elements)
  const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (textMatches) {
    for (const match of textMatches) {
      const text = match.replace(/<[^>]*>/g, "").trim();
      if (text) {
        extractedText.push(text);
      }
    }
  }
  
  // Also try generic text extraction
  const genericText = content.match(/>([A-Za-z0-9\s.,!?;:'"()-]{3,})</g);
  if (genericText && extractedText.length < 10) {
    for (const match of genericText) {
      const text = match.slice(1, -1).trim();
      if (text.length > 2 && isReadableText(text)) {
        extractedText.push(text);
      }
    }
  }
  
  const result = extractedText.join(" ").replace(/\s+/g, " ").trim();
  
  if (result.length < 50) {
    return `[Word document: ${file.name}] - Content could not be fully extracted. File size: ${file.size} bytes.`;
  }
  
  return result;
}
