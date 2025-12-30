/**
 * Linear MCP Agent
 * AI agent that uses Linear's MCP server to intelligently create issue hierarchies
 */

import { MCPClient, createMCPClient, type MCPToolCall } from "./mcpClient";

const LINEAR_MCP_SERVER = "https://mcp.linear.app/mcp";

export interface LinearMCPExportOptions {
  apiKey: string;
  teamId: string;
  projectId?: string;
  prdTitle: string;
  prdContent: string;
}

export interface LinearMCPExportResult {
  success: boolean;
  rootIssueId?: string;
  createdIssues: Array<{
    id: string;
    identifier: string;
    title: string;
    url: string;
  }>;
  totalIssues: number;
  errors: string[];
  agentLog: string[];
}

/**
 * Export PRD to Linear using MCP tools and AI agent
 */
export async function exportPRDViaLinearMCP(
  options: LinearMCPExportOptions
): Promise<LinearMCPExportResult> {
  const { apiKey, teamId, projectId, prdTitle, prdContent } = options;

  const result: LinearMCPExportResult = {
    success: false,
    createdIssues: [],
    totalIssues: 0,
    errors: [],
    agentLog: [],
  };

  let mcpClient: MCPClient | null = null;

  try {
    // Step 1: Connect to Linear's MCP server
    result.agentLog.push("Connecting to Linear MCP server...");
    mcpClient = await createMCPClient({
      serverUrl: LINEAR_MCP_SERVER,
      authToken: apiKey,
    });
    result.agentLog.push("✓ Connected to Linear MCP");

    // Step 2: List available tools
    result.agentLog.push("Discovering available tools...");
    const tools = await mcpClient.listTools();
    result.agentLog.push(`✓ Found ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`);

    // Step 3: Use AI to analyze PRD and create execution plan
    result.agentLog.push("Analyzing PRD structure with AI...");
    const plan = await createExecutionPlan(prdTitle, prdContent, teamId, projectId);
    result.agentLog.push(`✓ Created plan with ${plan.steps.length} steps`);

    // Step 4: Execute plan using MCP tools
    result.agentLog.push("Executing issue creation plan...");
    for (const step of plan.steps) {
      result.agentLog.push(`  Creating: ${step.title}`);

      const toolCall: MCPToolCall = {
        name: "linear_create_issue",
        arguments: {
          teamId: step.teamId,
          title: step.title,
          description: step.description,
          projectId: step.projectId,
          priority: step.priority,
          parentId: step.parentId,
        },
      };

      const toolResult = await mcpClient.callTool(toolCall);

      if (toolResult.isError) {
        const errorMsg = toolResult.content[0]?.text || "Unknown error";
        result.errors.push(`Failed to create "${step.title}": ${errorMsg}`);
        result.agentLog.push(`  ✗ Error: ${errorMsg}`);
        continue;
      }

      // Parse the result to extract issue details
      const issueData = parseIssueFromToolResult(toolResult);
      if (issueData) {
        result.createdIssues.push(issueData);
        result.agentLog.push(`  ✓ Created ${issueData.identifier}: ${issueData.title}`);

        // Update step's issue ID for children
        step.issueId = issueData.id;
      }
    }

    result.totalIssues = result.createdIssues.length;
    result.rootIssueId = result.createdIssues[0]?.id;
    result.success = result.errors.length === 0;

    result.agentLog.push(`\n✓ Export complete: ${result.totalIssues} issues created`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    result.agentLog.push(`✗ Fatal error: ${errorMsg}`);
    return result;
  } finally {
    // Clean up MCP connection
    if (mcpClient) {
      await mcpClient.close();
    }
  }
}

/**
 * Create execution plan by analyzing PRD with AI
 */
async function createExecutionPlan(
  title: string,
  content: string,
  teamId: string,
  projectId?: string
): Promise<ExecutionPlan> {
  const prompt = `Analyze this Product Requirements Document and create a step-by-step plan for creating Linear issues.

PRD Title: ${title}

PRD Content:
${content}

Create a hierarchical plan following these rules:
1. First step creates the root epic for the main feature
2. Subsequent steps create features as children of the epic
3. Then create tasks as children of features
4. Create subtasks as children of tasks if needed
5. Maximum 3-4 levels deep
6. Each step should have clear title and description
7. Assign priorities: 1=urgent, 2=high, 3=normal, 4=low

Return ONLY a JSON object with this structure:
{
  "steps": [
    {
      "title": "Epic: Feature Name",
      "description": "Detailed description",
      "priority": 2,
      "parentStepIndex": null,
      "stepIndex": 0
    },
    {
      "title": "Feature: Sub-feature",
      "description": "Feature details",
      "priority": 2,
      "parentStepIndex": 0,
      "stepIndex": 1
    }
  ]
}

The parentStepIndex references the step index of the parent issue (null for root).
Return ONLY the JSON, no markdown formatting.`;

  // Call Anthropic API
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.statusText}`);
  }

  const result = await response.json();
  const aiContent = result.content[0].text;

  // Clean and parse JSON
  const cleaned = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Convert to execution plan with proper parent references
  const steps: ExecutionStep[] = [];
  const stepIdMap = new Map<number, string>(); // stepIndex -> issueId

  for (const step of parsed.steps) {
    const parentId =
      step.parentStepIndex !== null
        ? stepIdMap.get(step.parentStepIndex)
        : undefined;

    steps.push({
      title: step.title,
      description: step.description,
      priority: step.priority,
      teamId,
      projectId,
      parentId,
      stepIndex: step.stepIndex,
      issueId: undefined, // Will be set after creation
    });
  }

  return { steps };
}

/**
 * Parse issue details from MCP tool result
 */
function parseIssueFromToolResult(result: any): {
  id: string;
  identifier: string;
  title: string;
  url: string;
} | null {
  try {
    // MCP tool results return content array with text
    const text = result.content[0]?.text;
    if (!text) return null;

    // Try to parse JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    return {
      id: data.id || data.issueId,
      identifier: data.identifier || data.key,
      title: data.title,
      url: data.url,
    };
  } catch (error) {
    console.error("Failed to parse issue from tool result:", error);
    return null;
  }
}

/**
 * Execution plan for creating issues
 */
interface ExecutionPlan {
  steps: ExecutionStep[];
}

interface ExecutionStep {
  title: string;
  description: string;
  priority: number;
  teamId: string;
  projectId?: string;
  parentId?: string;
  stepIndex: number;
  issueId?: string; // Set after creation
}
