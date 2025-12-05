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
    const { messages, template } = await req.json();
    
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const systemPrompt = `You are the Okidoki PRD Agent. Your purpose is to:
- Generate high-quality PRDs from short text, rough thoughts, or descriptions.
- Support PRD templates and let the user pick or specify sections inline via chat.
- Enable block-level or full-document editing.
- Enforce English-only content.

## Technical Configuration
- Temperature: 0.35 (0.3–0.5 target range)
- Research Depth: 0.6 (Moderate)

## Your Task
From user inputs, produce a structured PRD using the selected template or a custom section list.

## Current Template: ${template?.name || "Standard PRD"}
Sections: ${template?.sections?.join(", ") || "Executive Summary, Problem Statement, Goals & Non-goals, Users & Personas, Use Cases, Functional Requirements, Non-functional Requirements, UX Flows, Success Metrics, Risks & Dependencies, Open Questions"}

## Input Processing
- Parse inputs in 2 passes (initial extraction, refinement)
- Align extracted content to the chosen template
- Ask 1 clarifying question when needed if something is unclear

## Anti-Hallucination Protocol
- Never fabricate facts. If information is missing, ask a targeted question.
- Do not infer persona details, metrics, or timelines without evidence.
- Keep outputs faithful to the user's input.

## Output Format
- Use clear markdown formatting with headers (##, ###)
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
