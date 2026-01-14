import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  parentId?: string;
  depth: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prdContent, prdTitle } = await req.json();

    if (!prdContent) {
      return new Response(
        JSON.stringify({ error: "PRD content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating backlog from PRD:", prdTitle || "Untitled");

    const systemPrompt = `You are a product management expert. Your task is to analyze a PRD (Product Requirements Document) and break it down into a structured backlog of tasks.

IMPORTANT RULES:
1. Create a hierarchical structure where each item can have children
2. The structure should follow: Epic > Feature > Task pattern but all represented as tasks
3. Each item must have:
   - A clear, actionable title
   - A short description (1-2 sentences)
   - Bullet-pointed requirements (what needs to be done)
4. Be thorough but practical - extract ALL actionable items from the PRD
5. Top-level items should be major work streams or epics
6. Nest related items under their parent

OUTPUT FORMAT - Return ONLY valid JSON with this structure:
{
  "items": [
    {
      "id": "1",
      "title": "Epic/Feature name",
      "description": "Brief description",
      "requirements": ["Requirement 1", "Requirement 2"],
      "depth": 0
    },
    {
      "id": "1.1",
      "title": "Sub-task name",
      "description": "Brief description",
      "requirements": ["Requirement 1"],
      "parentId": "1",
      "depth": 1
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this PRD and create a comprehensive backlog:\n\n${prdContent}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("Empty AI response");
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response received, parsing...");

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = aiContent;
    const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(jsonStr.trim());
      const items: BacklogItem[] = parsed.items || [];

      console.log(`Generated ${items.length} backlog items`);

      return new Response(
        JSON.stringify({
          success: true,
          backlog: {
            id: crypto.randomUUID(),
            prdTitle: prdTitle || "Untitled PRD",
            items,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "\nContent:", aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse backlog structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error generating backlog:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
