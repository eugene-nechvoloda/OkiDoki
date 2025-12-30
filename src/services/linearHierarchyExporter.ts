/**
 * Linear Hierarchy Exporter
 * Intelligently exports PRD structure to Linear as a hierarchy of issues
 */

import { createLinearIssue, type LinearIssue } from "./linearApi";
import {
  parsePRDStructure,
  flattenStructure,
  type ParsedIssueNode,
  type PRDStructure,
} from "./prdStructureParser";

export interface ExportResult {
  success: boolean;
  rootIssue?: LinearIssue;
  createdIssues: LinearIssue[];
  totalIssues: number;
  errors: string[];
}

export interface ExportOptions {
  apiKey: string;
  teamId: string;
  projectId?: string;
  prdTitle: string;
  prdContent: string;
}

/**
 * Export PRD to Linear as a hierarchical structure of issues
 */
export async function exportPRDToLinearHierarchy(
  options: ExportOptions
): Promise<ExportResult> {
  const { apiKey, teamId, projectId, prdTitle, prdContent } = options;

  const result: ExportResult = {
    success: false,
    createdIssues: [],
    totalIssues: 0,
    errors: [],
  };

  try {
    // Step 1: Parse PRD structure using AI
    console.log("Parsing PRD structure...");
    const structure: PRDStructure = await parsePRDStructure(
      prdContent,
      prdTitle
    );

    result.totalIssues = structure.metadata.totalIssues;
    console.log(
      `Parsed structure: ${structure.metadata.totalIssues} issues, depth ${structure.metadata.maxDepth}`
    );

    // Step 2: Create issues in hierarchical order (parent before children)
    console.log("Creating issues in Linear...");
    const issueMap = new Map<string, LinearIssue>();

    await createIssuesRecursively(
      structure.root,
      apiKey,
      teamId,
      projectId,
      null,
      issueMap,
      result
    );

    // Set root issue
    result.rootIssue = result.createdIssues[0];
    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    console.error("Failed to export PRD to Linear:", error);
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error during export"
    );
    return result;
  }
}

/**
 * Recursively create issues in Linear, maintaining parent-child relationships
 */
async function createIssuesRecursively(
  node: ParsedIssueNode,
  apiKey: string,
  teamId: string,
  projectId: string | undefined,
  parentId: string | null,
  issueMap: Map<string, LinearIssue>,
  result: ExportResult,
  path: string = "0"
): Promise<void> {
  try {
    // Create current issue
    const issue = await createLinearIssue(apiKey, {
      teamId,
      title: node.title,
      description: node.description,
      projectId,
      priority: node.priority,
      parentId: parentId || undefined,
    });

    // Store in map and results
    issueMap.set(path, issue);
    result.createdIssues.push(issue);

    console.log(
      `Created ${node.type}: ${issue.identifier} - ${issue.title}${parentId ? ` (parent: ${parentId})` : ""}`
    );

    // Create children with this issue as parent
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childPath = `${path}.${i}`;

        await createIssuesRecursively(
          child,
          apiKey,
          teamId,
          projectId,
          issue.id,
          issueMap,
          result,
          childPath
        );
      }
    }
  } catch (error) {
    const errorMsg = `Failed to create issue "${node.title}": ${error instanceof Error ? error.message : "Unknown error"}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
}

/**
 * Export PRD with custom structure (for advanced use cases)
 */
export async function exportCustomStructure(
  apiKey: string,
  teamId: string,
  projectId: string | undefined,
  structure: PRDStructure
): Promise<ExportResult> {
  const result: ExportResult = {
    success: false,
    createdIssues: [],
    totalIssues: structure.metadata.totalIssues,
    errors: [],
  };

  const issueMap = new Map<string, LinearIssue>();

  await createIssuesRecursively(
    structure.root,
    apiKey,
    teamId,
    projectId,
    null,
    issueMap,
    result
  );

  result.rootIssue = result.createdIssues[0];
  result.success = result.errors.length === 0;

  return result;
}

/**
 * Preview the structure that would be created (without actually creating issues)
 */
export async function previewPRDStructure(
  prdTitle: string,
  prdContent: string
): Promise<PRDStructure> {
  return await parsePRDStructure(prdContent, prdTitle);
}

/**
 * Format the structure as a readable tree for display
 */
export function formatStructureTree(
  node: ParsedIssueNode,
  indent: number = 0
): string {
  const prefix = "  ".repeat(indent);
  const icon = getTypeIcon(node.type);
  let result = `${prefix}${icon} ${node.title}\n`;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result += formatStructureTree(child, indent + 1);
    }
  }

  return result;
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "epic":
      return "🎯";
    case "feature":
      return "✨";
    case "task":
      return "📋";
    case "subtask":
      return "▫️";
    default:
      return "•";
  }
}
