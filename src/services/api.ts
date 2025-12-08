import { supabase } from '@/integrations/supabase/client';
import type {
  Chat,
  ChatInsert,
  ChatMessage,
  ChatMessageInsert,
  PRDDocument,
  PRDDocumentInsert,
  FileAttachment,
  Template,
  Project,
} from '@/types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Helper to get auth headers
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

// =====================================================
// CHAT API
// =====================================================

export interface SaveChatRequest {
  chatId?: string;
  title?: string;
  projectId?: string;
  prdDocumentId?: string;
  settings?: any;
  messages?: Array<{
    role: string;
    content: string;
    attachments?: any[];
  }>;
}

export interface SaveChatResponse {
  chat: Chat;
}

export async function saveChat(data: SaveChatRequest): Promise<SaveChatResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/save-chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save chat');
  }

  return response.json();
}

export interface GetChatsResponse {
  chats: Chat[];
}

export interface GetChatResponse {
  chat: Chat;
  messages: ChatMessage[];
}

export async function getChats(params?: {
  limit?: number;
  offset?: number;
}): Promise<GetChatsResponse> {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-chats?${queryParams}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chats');
  }

  return response.json();
}

export async function getChat(chatId: string): Promise<GetChatResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-chats?chatId=${chatId}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chat');
  }

  return response.json();
}

// =====================================================
// DOCUMENT API
// =====================================================

export interface SaveDocumentRequest {
  documentId?: string;
  title: string;
  contentMarkdown?: string;
  contentJson?: any;
  status?: 'draft' | 'final' | 'archived';
  visibility?: 'private' | 'public';
  projectId?: string;
  templateId?: string;
}

export interface SaveDocumentResponse {
  document: PRDDocument;
}

export async function saveDocument(
  data: SaveDocumentRequest
): Promise<SaveDocumentResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/save-document`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save document');
  }

  return response.json();
}

export interface GetDocumentsResponse {
  documents: PRDDocument[];
}

export interface GetDocumentResponse {
  document: PRDDocument;
}

export async function getDocuments(params?: {
  limit?: number;
  offset?: number;
  projectId?: string;
  status?: string;
  search?: string;
}): Promise<GetDocumentsResponse> {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.projectId) queryParams.set('projectId', params.projectId);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.search) queryParams.set('search', params.search);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-documents?${queryParams}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch documents');
  }

  return response.json();
}

export async function getDocument(documentId: string): Promise<GetDocumentResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-documents?documentId=${documentId}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch document');
  }

  return response.json();
}

// =====================================================
// FILE PROCESSING API
// =====================================================

export interface ProcessFileResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    storagePath: string;
    extractedContent: string;
  };
}

export async function processFile(
  file: File,
  chatMessageId?: string
): Promise<ProcessFileResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (chatMessageId) {
    formData.append('chatMessageId', chatMessageId);
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to process file');
  }

  return response.json();
}

// =====================================================
// TEMPLATES API
// =====================================================

export interface GetTemplatesResponse {
  templates: Template[];
}

export async function getTemplates(params?: {
  limit?: number;
  visibility?: string;
}): Promise<GetTemplatesResponse> {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.visibility) queryParams.set('visibility', params.visibility);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-templates?${queryParams}`,
    { headers }
  );

  if (!response.ok) {
    // Fallback: query directly from Supabase if edge function doesn't exist
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('is_custom', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { templates: data || [] };
    } catch (err) {
      throw new Error('Failed to fetch templates');
    }
  }

  return response.json();
}

// =====================================================
// PROJECTS API
// =====================================================

export interface GetProjectsResponse {
  projects: Project[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
}

export interface UpdateProjectRequest {
  projectId: string;
  name?: string;
  description?: string;
  visibility?: 'private' | 'public';
}

export async function getProjects(params?: {
  limit?: number;
  search?: string;
}): Promise<GetProjectsResponse> {
  try {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { projects: data || [] };
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    return { projects: [] };
  }
}

export async function createProject(
  data: CreateProjectRequest
): Promise<{ project: Project }> {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      description: data.description,
      visibility: data.visibility || 'private',
      owner_id: (await supabase.auth.getUser()).data.user?.id || '',
    })
    .select()
    .single();

  if (error) throw error;
  return { project };
}

export async function updateProject(
  data: UpdateProjectRequest
): Promise<{ project: Project }> {
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.visibility) updateData.visibility = data.visibility;

  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', data.projectId)
    .select()
    .single();

  if (error) throw error;
  return { project };
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

// =====================================================
// PRD GENERATION API (Enhanced)
// =====================================================

export interface GeneratePRDRequest {
  messages: Array<{ role: string; content: string }>;
  template?: {
    id: string;
    name: string;
    sections: string[];
  };
  settings?: {
    tone: string;
    docType: string;
    hierarchy: string;
  };
  chatId?: string;
  autoSave?: boolean;
}

export async function generatePRD(
  data: GeneratePRDRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-prd`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate PRD: ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}
