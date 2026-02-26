/**
 * Knowledge Base Service
 * Handles document storage, web source management, and RAG retrieval
 * Uses migration-aware guest storage for data persistence
 */

import { supabase } from "@/integrations/supabase/client";
import { readGuestJson, writeGuestJson } from "./guestStorage";

export interface KnowledgeDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  content_text: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeWebSource {
  id: string;
  user_id: string;
  url: string;
  title: string;
  content_text: string;
  last_crawled_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY_DOCS = "okidoki_documents";
const STORAGE_KEY_WEB = "okidoki_web_sources";

/**
 * Upload a document to the knowledge base
 * Currently uses localStorage for all users
 */
export async function uploadKnowledgeDocument(
  file: File
): Promise<KnowledgeDocument> {
  const contentText = await extractTextFromFile(file);

  const doc: KnowledgeDocument = {
    id: crypto.randomUUID(),
    user_id: "user",
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: "",
    content_text: contentText,
    metadata: { original_name: file.name },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Store using migration-aware helper
  const docs = readGuestJson<KnowledgeDocument[]>(STORAGE_KEY_DOCS, []);
  docs.push(doc);
  writeGuestJson(STORAGE_KEY_DOCS, docs);

  return doc;
}

/**
 * Get all knowledge documents for current user
 */
export async function getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  return readGuestJson<KnowledgeDocument[]>(STORAGE_KEY_DOCS, []);
}

/**
 * Delete a knowledge document
 */
export async function deleteKnowledgeDocument(docId: string): Promise<void> {
  const docs = readGuestJson<KnowledgeDocument[]>(STORAGE_KEY_DOCS, []);
  const filtered = docs.filter((d) => d.id !== docId);
  writeGuestJson(STORAGE_KEY_DOCS, filtered);
}

/**
 * Add a web source
 */
export async function addKnowledgeWebSource(url: string): Promise<KnowledgeWebSource> {
  const { title, content } = await fetchWebContent(url);

  const source: KnowledgeWebSource = {
    id: crypto.randomUUID(),
    user_id: "user",
    url,
    title,
    content_text: content,
    last_crawled_at: new Date().toISOString(),
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sources = readGuestJson<KnowledgeWebSource[]>(STORAGE_KEY_WEB, []);
  sources.push(source);
  writeGuestJson(STORAGE_KEY_WEB, sources);

  return source;
}

/**
 * Get all web sources for current user
 */
export async function getKnowledgeWebSources(): Promise<KnowledgeWebSource[]> {
  return readGuestJson<KnowledgeWebSource[]>(STORAGE_KEY_WEB, []);
}

/**
 * Delete a web source
 */
export async function deleteKnowledgeWebSource(sourceId: string): Promise<void> {
  const sources = readGuestJson<KnowledgeWebSource[]>(STORAGE_KEY_WEB, []);
  const filtered = sources.filter((s) => s.id !== sourceId);
  writeGuestJson(STORAGE_KEY_WEB, filtered);
}

/**
 * Refresh a web source (re-crawl content)
 */
export async function refreshWebSource(sourceId: string): Promise<void> {
  const sources = readGuestJson<KnowledgeWebSource[]>(STORAGE_KEY_WEB, []);
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return;

  const { title, content } = await fetchWebContent(source.url);
  source.title = title;
  source.content_text = content;
  source.last_crawled_at = new Date().toISOString();
  writeGuestJson(STORAGE_KEY_WEB, sources);
}

/**
 * Extract text content from file based on type
 */
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // Plain text files - read directly
  if (fileType === "text/plain" || fileType === "text/csv" || 
      fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
    return await file.text();
  }

  // PDF and Word files - use edge function
  if (fileType === "application/pdf" || fileName.endsWith('.pdf') ||
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword" ||
      fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return await parseDocumentWithEdgeFunction(file);
  }

  // Fallback: try to read as text
  try {
    return await file.text();
  } catch {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Parse document using edge function
 */
async function parseDocumentWithEdgeFunction(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await supabase.functions.invoke("parse-document", {
      body: formData,
    });

    if (response.error) {
      console.error("Edge function error:", response.error);
      throw new Error(`Failed to parse document: ${response.error.message}`);
    }

    return response.data?.text || `[Document: ${file.name}] - Content extracted`;
  } catch (error) {
    console.error("Parse document error:", error);
    throw new Error(`Failed to parse ${file.name}`);
  }
}

/**
 * Fetch and parse web content
 */
async function fetchWebContent(url: string): Promise<{ title: string; content: string }> {
  const response = await supabase.functions.invoke("fetch-web-content", {
    body: { url },
  });

  if (response.error) {
    throw new Error("Failed to fetch web content");
  }

  return {
    title: response.data.title || url,
    content: response.data.content || "",
  };
}

/**
 * Retrieve relevant knowledge base context for PRD generation
 */
export async function retrieveKnowledgeContext(query: string): Promise<string> {
  const [documents, webSources] = await Promise.all([
    getKnowledgeDocuments(),
    getKnowledgeWebSources(),
  ]);

  if (documents.length === 0 && webSources.length === 0) {
    return "";
  }

  // Simple relevance scoring based on keyword matching
  const keywords = extractKeywords(query);

  const relevantDocs = documents
    .map((doc) => ({
      ...doc,
      score: calculateRelevance(doc.content_text, keywords),
    }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const relevantSources = webSources
    .map((source) => ({
      ...source,
      score: calculateRelevance(source.content_text, keywords),
    }))
    .filter((source) => source.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Build context string
  let context = "\n\n--- Knowledge Base Context ---\n\n";

  if (relevantDocs.length > 0) {
    context += "Relevant Documents:\n\n";
    for (const doc of relevantDocs) {
      context += `From "${doc.file_name}":\n${doc.content_text.substring(0, 1000)}...\n\n`;
    }
  }

  if (relevantSources.length > 0) {
    context += "Relevant Web Sources:\n\n";
    for (const source of relevantSources) {
      context += `From "${source.title}" (${source.url}):\n${source.content_text.substring(0, 1000)}...\n\n`;
    }
  }

  context += "--- End Knowledge Base Context ---\n\n";

  return context;
}

/**
 * Extract keywords from query
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"]);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

/**
 * Calculate relevance score
 */
function calculateRelevance(content: string, keywords: string[]): number {
  const contentLower = content.toLowerCase();
  return keywords.reduce((score, keyword) => {
    const count = (contentLower.match(new RegExp(keyword, "g")) || []).length;
    return score + count;
  }, 0);
}
