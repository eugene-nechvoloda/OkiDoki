import { supabase } from "@/integrations/supabase/client";

export interface NapkinDiagramRequest {
  text: string;
  title?: string;
  diagramType?: DiagramType;
  style?: VisualStyle;
  context?: string;
  goal?: string;
}

export type DiagramType =
  | "flowchart"
  | "workflow"
  | "data-flow"
  | "erd"
  | "mind-map"
  | "business-framework"
  | "process-map"
  | "infographic"
  | "auto"; // Let Napkin decide

export type VisualStyle =
  | "modern"
  | "minimal"
  | "professional"
  | "playful"
  | "technical"
  | "default";

export interface NapkinDiagramResult {
  success: boolean;
  diagramUrl?: string;
  imageUrl?: string;
  jobId?: string;
  error?: string;
  message?: string;
}

export interface NapkinGenerationStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  diagramUrl?: string;
  imageUrl?: string;
  error?: string;
}

/**
 * Generate a diagram from PRD text using Napkin AI
 */
export async function generateDiagram(
  request: NapkinDiagramRequest
): Promise<NapkinDiagramResult> {
  try {
    const { data, error } = await supabase.functions.invoke("napkin-generate-diagram", {
      body: {
        text: request.text,
        title: request.title,
        diagramType: request.diagramType || "auto",
        style: request.style || "professional",
        context: request.context,
        goal: request.goal,
      },
    });

    if (error) {
      console.error("Napkin diagram generation error:", error);
      return {
        success: false,
        error: error.message || "Failed to generate diagram",
      };
    }

    if (data?.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      diagramUrl: data.diagramUrl,
      imageUrl: data.imageUrl,
      jobId: data.jobId,
      message: data.message,
    };
  } catch (error) {
    console.error("Failed to generate Napkin diagram:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate diagram",
    };
  }
}

/**
 * Check the status of an async diagram generation job
 */
export async function checkDiagramStatus(
  jobId: string
): Promise<NapkinGenerationStatus> {
  try {
    const { data, error } = await supabase.functions.invoke("napkin-check-status", {
      body: { jobId },
    });

    if (error) {
      console.error("Napkin status check error:", error);
      return {
        status: "failed",
        error: error.message || "Failed to check status",
      };
    }

    if (data?.error) {
      return {
        status: "failed",
        error: data.error,
      };
    }

    return {
      status: data.status || "pending",
      progress: data.progress,
      diagramUrl: data.diagramUrl,
      imageUrl: data.imageUrl,
      error: data.error,
    };
  } catch (error) {
    console.error("Failed to check Napkin diagram status:", error);
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to check status",
    };
  }
}

/**
 * Determine the best diagram type based on PRD content analysis
 */
export function suggestDiagramType(prdContent: string): DiagramType {
  const lower = prdContent.toLowerCase();

  // Look for keywords that suggest specific diagram types
  if (
    lower.includes("database") ||
    lower.includes("schema") ||
    lower.includes("entity") ||
    lower.includes("table") ||
    lower.includes("relationship")
  ) {
    return "erd";
  }

  if (
    lower.includes("workflow") ||
    lower.includes("process") ||
    lower.includes("step") ||
    lower.includes("approval") ||
    lower.includes("pipeline")
  ) {
    return "workflow";
  }

  if (
    lower.includes("data flow") ||
    lower.includes("data pipeline") ||
    lower.includes("data transformation") ||
    lower.includes("api") ||
    lower.includes("integration")
  ) {
    return "data-flow";
  }

  if (
    lower.includes("decision") ||
    lower.includes("condition") ||
    lower.includes("if ") ||
    lower.includes("branch")
  ) {
    return "flowchart";
  }

  if (
    lower.includes("concept") ||
    lower.includes("idea") ||
    lower.includes("brainstorm") ||
    lower.includes("hierarchy")
  ) {
    return "mind-map";
  }

  if (
    lower.includes("framework") ||
    lower.includes("strategy") ||
    lower.includes("business model") ||
    lower.includes("canvas")
  ) {
    return "business-framework";
  }

  // Default to auto if no clear match
  return "auto";
}

/**
 * Extract key context from PRD for better diagram generation
 */
export function extractDiagramContext(prdContent: string): string {
  const lines = prdContent.split("\n");
  const contextLines: string[] = [];

  // Extract title and key sections
  for (const line of lines) {
    const trimmed = line.trim();

    // Include headers
    if (trimmed.startsWith("#")) {
      contextLines.push(trimmed);
    }

    // Include lines with key terms
    if (
      trimmed.includes("objective") ||
      trimmed.includes("goal") ||
      trimmed.includes("key feature") ||
      trimmed.includes("requirement") ||
      trimmed.includes("user flow")
    ) {
      contextLines.push(trimmed);
    }

    // Limit context to avoid overwhelming the API
    if (contextLines.length >= 20) break;
  }

  return contextLines.join("\n").substring(0, 1000); // Limit to 1000 chars
}
