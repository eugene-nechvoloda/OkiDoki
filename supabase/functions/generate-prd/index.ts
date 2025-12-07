import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Settings {
  tone: string;
  docType: string;
  hierarchy: string;
}

interface Template {
  id: string;
  name: string;
  sections: string[];
}

function getToneInstructions(tone: string): string {
  switch (tone) {
    case "detailed":
      return "Write in a detailed, thorough manner with comprehensive explanations for each section. Include examples and edge cases where relevant.";
    case "concise":
      return "Write in a concise, direct manner. Be brief and to the point. Avoid unnecessary elaboration.";
    case "creative":
      return "Write in a creative, exploratory manner. Feel free to suggest innovative approaches and think outside the box.";
    case "balanced":
    default:
      return "Write in a balanced, professional manner. Be clear and informative without being overly verbose.";
  }
}

function getDocTypeInstructions(docType: string): string {
  switch (docType) {
    case "project":
      return `You are creating a PROJECT with multiple related documents. Structure your response as a collection of interconnected documents:
- Start with a Project Overview document
- Create separate logical documents for major sections (e.g., Technical Spec, User Stories, Design Requirements)
- Use clear document boundaries with "---" separators
- Reference other documents where relevant`;
    case "single":
    default:
      return "You are creating a single, comprehensive document. Keep all content in one cohesive PRD.";
  }
}

function getHierarchyInstructions(hierarchy: string): string {
  switch (hierarchy) {
    case "2-levels":
      return `Use a 2-level document hierarchy:
- Level 1: Main sections (##)
- Level 2: Subsections (###)
Keep the structure relatively flat with clear main sections and their immediate subsections.`;
    case "3-levels":
      return `Use a complex 3+ level document hierarchy:
- Level 1: Major sections (##)
- Level 2: Subsections (###)
- Level 3: Detailed items (####)
- Use nested bullet points for additional detail
This allows for comprehensive, deeply organized documentation.`;
    case "1-level":
    default:
      return "Use a flat, 1-level structure with main sections only (##). Keep it simple and easy to scan.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, template, settings } = await req.json();
    
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Extract settings with defaults
    const tone = settings?.tone || "balanced";
    const docType = settings?.docType || "single";
    const hierarchy = settings?.hierarchy || "1-level";

    console.log("Generating PRD with settings:", { tone, docType, hierarchy, template: template?.name });

    const systemPrompt = `You are the Okidoki PRD Agent. Your purpose is to:
- Generate high-quality PRDs from short text, rough thoughts, or descriptions.
- Support PRD templates and let the user pick or specify sections inline via chat.
- Enable block-level or full-document editing.
- Enforce English-only content.

## Technical Configuration
- Temperature: 0.35 (0.3–0.5 target range)
- Research Depth: 0.6 (Moderate)

## Writing Style
${getToneInstructions(tone)}

## Document Type
${getDocTypeInstructions(docType)}

## Document Hierarchy
${getHierarchyInstructions(hierarchy)}

## Template Configuration
${template ? `Using template: ${template.name}
Sections to include: ${template.sections?.join(", ")}` : `No specific template selected - use your best judgment to determine the most appropriate format based on the user's request. Consider these options:
- Standard PRD for feature requirements
- Discovery Brief for research/exploration
- Experiment PRD for A/B tests or experiments
- RFC for technical proposals
- API Documentation for technical specs
- Competitive Analysis for market research`}

## Input Processing
- Parse inputs in 2 passes (initial extraction, refinement)
- Align extracted content to the chosen template or auto-detected format
- Ask 1 clarifying question when needed if something is unclear

## Anti-Hallucination Protocol
- Never fabricate facts. If information is missing, ask a targeted question.
- Do not infer persona details, metrics, or timelines without evidence.
- Keep outputs faithful to the user's input.

## Output Format
- Use clear markdown formatting appropriate for the hierarchy level selected
- Use bullet lists for requirements, acceptance criteria, risks, and open questions
- Provide a short Executive Summary upfront
- Each requirement should have: ID (R-001), description, priority (P0/P1/P2), and acceptance criteria

Before drafting a PRD, ask the user these clarifying questions if they haven't provided enough context:
1. What is the feature/product called?
2. What product is this for and who are the primary users?
3. What problem does this solve? How do users currently workaround it?
4. What are the top 2-3 business goals?
5. Is this a v1/MVP or mature feature?
6. Any hard constraints (platforms, deadlines, security)?
7. Who is the main audience for this PRD?

Keep responses conversational but professional. Be concise and actionable.`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI API error: " + errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE to OpenAI-compatible format
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const openAIFormat = {
                  choices: [{
                    delta: { content: parsed.delta.text },
                    index: 0,
                  }],
                };
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`)
                );
              } else if (parsed.type === "message_stop") {
                controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      },
    });

    const transformedBody = response.body?.pipeThrough(transformStream);

    return new Response(transformedBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
