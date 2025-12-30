/**
 * PRD Structure Parser
 * Uses AI to intelligently parse PRD content and extract hierarchical structure
 * for creating organized issue hierarchies in Linear
 */

export interface ParsedIssueNode {
  title: string;
  description: string;
  type: "epic" | "feature" | "task" | "subtask";
  priority?: number;
  children?: ParsedIssueNode[];
}

export interface PRDStructure {
  root: ParsedIssueNode;
  metadata: {
    totalIssues: number;
    maxDepth: number;
  };
}

/**
 * Parse PRD content into a hierarchical structure
 * Uses AI to intelligently extract epics, features, and tasks
 */
export async function parsePRDStructure(
  prdContent: string,
  prdTitle: string
): Promise<PRDStructure> {
  // Extract structured hierarchy from PRD using AI analysis
  const structure = await analyzeWithAI(prdContent, prdTitle);

  return structure;
}

/**
 * AI-powered analysis to extract hierarchical structure from PRD
 */
async function analyzeWithAI(
  content: string,
  title: string
): Promise<PRDStructure> {
  const prompt = `Analyze this Product Requirements Document and extract a hierarchical issue structure suitable for Linear.

PRD Title: ${title}

PRD Content:
${content}

Extract the structure following these rules:
1. Create a root epic for the main feature/product
2. Identify major features as child issues
3. Break down features into tasks
4. Break down complex tasks into subtasks if needed
5. Keep hierarchy reasonable (max 3-4 levels deep)
6. Extract clear, actionable titles
7. Include relevant context in descriptions

Return ONLY a JSON object with this exact structure:
{
  "root": {
    "title": "Main epic title",
    "description": "Epic description",
    "type": "epic",
    "priority": 1-4,
    "children": [
      {
        "title": "Feature title",
        "description": "Feature description",
        "type": "feature",
        "priority": 1-4,
        "children": [
          {
            "title": "Task title",
            "description": "Task description",
            "type": "task",
            "priority": 1-4,
            "children": []
          }
        ]
      }
    ]
  }
}

Priority levels: 1 = urgent, 2 = high, 3 = normal, 4 = low

Return ONLY the JSON, no markdown formatting, no explanation.`;

  try {
    // Use Anthropic API directly (assuming it's available in the environment)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
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

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${result.error?.message || "Unknown error"}`);
    }

    const content = result.content[0].text;

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Calculate metadata
    const metadata = {
      totalIssues: countIssues(parsed.root),
      maxDepth: calculateDepth(parsed.root),
    };

    return {
      root: parsed.root,
      metadata,
    };
  } catch (error) {
    console.error("AI parsing failed, falling back to simple structure:", error);
    // Fallback to simple structure
    return createFallbackStructure(title, content);
  }
}

/**
 * Count total number of issues in the tree
 */
function countIssues(node: ParsedIssueNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countIssues(child);
    }
  }
  return count;
}

/**
 * Calculate maximum depth of the tree
 */
function calculateDepth(node: ParsedIssueNode, currentDepth = 1): number {
  if (!node.children || node.children.length === 0) {
    return currentDepth;
  }

  const childDepths = node.children.map(child =>
    calculateDepth(child, currentDepth + 1)
  );

  return Math.max(...childDepths);
}

/**
 * Create a simple fallback structure when AI parsing fails
 */
function createFallbackStructure(
  title: string,
  content: string
): PRDStructure {
  // Simple heuristic: create one epic with the full content
  const root: ParsedIssueNode = {
    title: title,
    description: content.substring(0, 10000), // Limit description length
    type: "epic",
    priority: 2,
    children: [],
  };

  return {
    root,
    metadata: {
      totalIssues: 1,
      maxDepth: 1,
    },
  };
}

/**
 * Flatten the tree structure for easier iteration
 */
export function flattenStructure(
  root: ParsedIssueNode,
  parentPath: number[] = []
): Array<{ node: ParsedIssueNode; path: number[]; depth: number }> {
  const result: Array<{ node: ParsedIssueNode; path: number[]; depth: number }> = [];

  result.push({
    node: root,
    path: parentPath,
    depth: parentPath.length
  });

  if (root.children) {
    root.children.forEach((child, index) => {
      const childPath = [...parentPath, index];
      result.push(...flattenStructure(child, childPath));
    });
  }

  return result;
}
