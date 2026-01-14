/**
 * Knowledge Base Service
 * Handles document storage, web source management, and RAG retrieval
 */

import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  content_text: string;
  metadata: Record<string, any>;
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
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Upload a document to the knowledge base
 */
export async function uploadKnowledgeDocument(
  file: File
): Promise<KnowledgeDocument> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode - store in localStorage
    return uploadKnowledgeDocumentGuest(file);
  }

  // Generate unique file path
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${user.id}/knowledge/${fileName}`;

  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Extract text content from file
  const contentText = await extractTextFromFile(file);

  // Save metadata to database
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: filePath,
      content_text: contentText,
      metadata: {
        original_name: file.name,
        uploaded_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save document: ${error.message}`);
  }

  return data;
}

/**
 * Upload document for guest users
 */
async function uploadKnowledgeDocumentGuest(file: File): Promise<KnowledgeDocument> {
  const contentText = await extractTextFromFile(file);

  const doc: KnowledgeDocument = {
    id: crypto.randomUUID(),
    user_id: "guest",
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: "",
    content_text: contentText,
    metadata: { original_name: file.name },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Store in localStorage
  const docs = JSON.parse(localStorage.getItem("okidoki_knowledge_docs") || "[]");
  docs.push(doc);
  localStorage.setItem("okidoki_knowledge_docs", JSON.stringify(docs));

  return doc;
}

/**
 * Get all knowledge documents for current user
 */
export async function getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode
    return JSON.parse(localStorage.getItem("okidoki_knowledge_docs") || "[]");
  }

  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch documents:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a knowledge document
 */
export async function deleteKnowledgeDocument(docId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode
    const docs = JSON.parse(localStorage.getItem("okidoki_knowledge_docs") || "[]");
    const filtered = docs.filter((d: KnowledgeDocument) => d.id !== docId);
    localStorage.setItem("okidoki_knowledge_docs", JSON.stringify(filtered));
    return;
  }

  // Get document to find storage path
  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", docId)
    .single();

  if (doc?.storage_path) {
    // Delete from storage
    await supabase.storage
      .from("knowledge-base")
      .remove([doc.storage_path]);
  }

  // Delete from database
  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", docId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Add a web source
 */
export async function addKnowledgeWebSource(url: string): Promise<KnowledgeWebSource> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return addKnowledgeWebSourceGuest(url);
  }

  // Fetch and parse URL content
  const { title, content } = await fetchWebContent(url);

  const { data, error } = await supabase
    .from("knowledge_web_sources")
    .insert({
      user_id: user.id,
      url,
      title,
      content_text: content,
      last_crawled_at: new Date().toISOString(),
      metadata: { added_at: new Date().toISOString() },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add web source: ${error.message}`);
  }

  return data;
}

/**
 * Add web source for guest users
 */
async function addKnowledgeWebSourceGuest(url: string): Promise<KnowledgeWebSource> {
  const { title, content } = await fetchWebContent(url);

  const source: KnowledgeWebSource = {
    id: crypto.randomUUID(),
    user_id: "guest",
    url,
    title,
    content_text: content,
    last_crawled_at: new Date().toISOString(),
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sources = JSON.parse(localStorage.getItem("okidoki_knowledge_web") || "[]");
  sources.push(source);
  localStorage.setItem("okidoki_knowledge_web", JSON.stringify(sources));

  return source;
}

/**
 * Get all web sources for current user
 */
export async function getKnowledgeWebSources(): Promise<KnowledgeWebSource[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return JSON.parse(localStorage.getItem("okidoki_knowledge_web") || "[]");
  }

  const { data, error } = await supabase
    .from("knowledge_web_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch web sources:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a web source
 */
export async function deleteKnowledgeWebSource(sourceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const sources = JSON.parse(localStorage.getItem("okidoki_knowledge_web") || "[]");
    const filtered = sources.filter((s: KnowledgeWebSource) => s.id !== sourceId);
    localStorage.setItem("okidoki_knowledge_web", JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from("knowledge_web_sources")
    .delete()
    .eq("id", sourceId);

  if (error) {
    throw new Error(`Failed to delete web source: ${error.message}`);
  }
}

/**
 * Refresh a web source (re-crawl content)
 */
export async function refreshWebSource(sourceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const sources = JSON.parse(localStorage.getItem("okidoki_knowledge_web") || "[]");
    const source = sources.find((s: KnowledgeWebSource) => s.id === sourceId);
    if (!source) return;

    const { title, content } = await fetchWebContent(source.url);
    source.title = title;
    source.content_text = content;
    source.last_crawled_at = new Date().toISOString();
    localStorage.setItem("okidoki_knowledge_web", JSON.stringify(sources));
    return;
  }

  const { data: source } = await supabase
    .from("knowledge_web_sources")
    .select("url")
    .eq("id", sourceId)
    .single();

  if (!source) return;

  const { title, content } = await fetchWebContent(source.url);

  await supabase
    .from("knowledge_web_sources")
    .update({
      title,
      content_text: content,
      last_crawled_at: new Date().toISOString(),
    })
    .eq("id", sourceId);
}

/**
 * Extract text content from file based on type
 */
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();

  if (fileType === "text/plain" || fileType === "text/csv") {
    return await file.text();
  }

  if (fileType === "application/pdf") {
    return await extractTextFromPDF(file);
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword"
  ) {
    return await extractTextFromWord(file);
  }

  // Fallback: try to read as text
  try {
    return await file.text();
  } catch {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract text from PDF using edge function
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await supabase.functions.invoke("parse-document", {
    body: formData,
  });

  if (response.error) {
    throw new Error("Failed to parse PDF");
  }

  return response.data.text || "";
}

/**
 * Extract text from Word document
 */
async function extractTextFromWord(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await supabase.functions.invoke("parse-document", {
    body: formData,
  });

  if (response.error) {
    throw new Error("Failed to parse Word document");
  }

  return response.data.text || "";
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
