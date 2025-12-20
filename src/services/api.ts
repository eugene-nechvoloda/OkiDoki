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
  Integration,
} from '@/types/database';
import { getGuestId, readGuestJson, writeGuestJson } from "@/services/guestStorage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const GUEST_STORAGE_KEYS = {
  chats: "okidoki_guest_chats",
  projects: "okidoki_guest_projects",
  templates: "okidoki_guest_templates",
  documents: "okidoki_guest_documents",
} as const;

async function isAuthenticated(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session?.user;
}

// Helper to get current user ID - falls back to a per-browser guest id
async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || getGuestId();
}

// Helper to get auth headers
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // TEMPORARY: Allow requests without session for testing
  // TODO: Re-enable authentication check once OAuth is fixed
  // if (!session) {
  //   throw new Error('Not authenticated');
  // }

  return {
    'Authorization': session ? `Bearer ${session.access_token}` : '',
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
  try {
    console.log('💬 saveChat called with:', data);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    // Guest mode: store locally only (no login required)
    if (!authed) {
      const now = new Date().toISOString();
      const chatId = data.chatId || crypto.randomUUID();

      const chats = readGuestJson<Chat[]>(GUEST_STORAGE_KEYS.chats, []);
      const existing = chats.find((c) => c.id === chatId);

      const chat: Chat = {
        id: chatId,
        user_id: userId,
        title: data.title ?? existing?.title ?? 'New Chat',
        settings_json: data.settings ?? existing?.settings_json ?? {},
        messages_json: data.messages ?? existing?.messages_json ?? [],
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      writeGuestJson(
        GUEST_STORAGE_KEYS.chats,
        [chat, ...chats.filter((c) => c.id !== chatId)]
      );

      return { chat };
    }

    // Authenticated mode: persist to backend
    if (data.chatId) {
      // Update existing chat - store messages in messages_json
      const { data: chat, error } = await supabase
        .from('chats')
        .update({
          title: data.title,
          settings_json: data.settings,
          messages_json: data.messages || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.chatId)
        .eq('user_id', userId) // Ensure user owns this chat
        .select()
        .single();

      if (error) {
        console.error('❌ Update chat error:', error);
        throw error;
      }

      console.log('✅ Chat updated:', chat);
      return { chat };
    }

    // Create new chat - store messages in messages_json
    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        title: data.title || 'New Chat',
        settings_json: data.settings,
        messages_json: data.messages || [],
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Create chat error:', error);
      throw error;
    }

    console.log('✅ Chat created:', chat);
    return { chat };
  } catch (error) {
    console.error('❌ Failed to save chat:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save chat');
  }
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
  try {
    console.log('💬 getChats called with:', params);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    // Guest mode: read from local storage
    if (!authed) {
      const all = readGuestJson<Chat[]>(GUEST_STORAGE_KEYS.chats, []).filter(
        (c) => c.user_id === userId
      );

      const sorted = [...all].sort((a, b) =>
        (b.updated_at || '').localeCompare(a.updated_at || '')
      );

      const offset = params?.offset ?? 0;
      const limit = params?.limit ?? 50;

      return { chats: sorted.slice(offset, offset + limit) };
    }

    let query = supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log('✅ Chats fetched:', data?.length || 0);
    return { chats: data || [] };
  } catch (error) {
    console.error('❌ Failed to fetch chats:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch chats');
  }
}

export async function getChat(chatId: string): Promise<GetChatResponse> {
  try {
    console.log('💬 getChat called for:', chatId);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    if (!authed) {
      const chats = readGuestJson<Chat[]>(GUEST_STORAGE_KEYS.chats, []).filter(
        (c) => c.user_id === userId
      );
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) throw new Error('Chat not found');

      const messagesJson = (chat as any).messages_json;
      const messages = Array.isArray(messagesJson) ? messagesJson : [];

      return { chat, messages: messages as ChatMessage[] };
    }

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (chatError) throw chatError;

    // Messages are stored in messages_json column, not a separate table
    const messagesJson = chat.messages_json;
    const messages = Array.isArray(messagesJson) ? messagesJson : [];

    console.log('✅ Chat fetched with', messages.length, 'messages');
    return { chat, messages: messages as ChatMessage[] };
  } catch (error) {
    console.error('❌ Failed to fetch chat:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch chat');
  }
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
  try {
    console.log('📄 saveDocument called with:', data);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    // Guest mode: store locally only
    if (!authed) {
      const now = new Date().toISOString();
      const documentId = data.documentId || crypto.randomUUID();

      const documents = readGuestJson<PRDDocument[]>(GUEST_STORAGE_KEYS.documents, []);
      const existing = documents.find((d) => d.id === documentId);

      const document: PRDDocument = {
        id: documentId,
        owner_id: userId,
        title: data.title,
        content_markdown: data.contentMarkdown ?? existing?.content_markdown ?? null,
        content_json: data.contentJson ?? existing?.content_json ?? null,
        status: (data.status ?? existing?.status ?? 'draft') as any,
        visibility: (data.visibility ?? existing?.visibility ?? 'private') as any,
        project_id: data.projectId ?? existing?.project_id ?? null,
        template_id: data.templateId ?? existing?.template_id ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      writeGuestJson(
        GUEST_STORAGE_KEYS.documents,
        [document, ...documents.filter((d) => d.id !== documentId)]
      );

      return { document };
    }

    if (data.documentId) {
      // Update existing document
      const { data: document, error } = await supabase
        .from('prd_documents')
        .update({
          title: data.title,
          content_markdown: data.contentMarkdown,
          content_json: data.contentJson,
          status: data.status || 'draft',
          visibility: data.visibility || 'private',
          project_id: data.projectId,
          template_id: data.templateId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.documentId)
        .eq('owner_id', userId) // Ensure user owns this document
        .select()
        .single();

      if (error) {
        console.error('❌ Update document error:', error);
        throw error;
      }

      console.log('✅ Document updated:', document);
      return { document };
    }

    // Create new document - use owner_id (correct column name)
    const { data: document, error } = await supabase
      .from('prd_documents')
      .insert({
        owner_id: userId,
        title: data.title,
        content_markdown: data.contentMarkdown,
        content_json: data.contentJson,
        status: data.status || 'draft',
        visibility: data.visibility || 'private',
        project_id: data.projectId,
        template_id: data.templateId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Create document error:', error);
      throw error;
    }

    console.log('✅ Document created:', document);
    return { document };
  } catch (error) {
    console.error('❌ Failed to save document:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save document');
  }
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
  try {
    console.log('📄 getDocuments called with:', params);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    if (!authed) {
      let documents = readGuestJson<PRDDocument[]>(GUEST_STORAGE_KEYS.documents, []).filter(
        (d) => d.owner_id === userId
      );

      // Apply filters
      if (params?.projectId) {
        documents = documents.filter((d) => d.project_id === params.projectId);
      }
      if (params?.status) {
        documents = documents.filter((d) => d.status === params.status);
      }
      if (params?.search) {
        const search = params.search.toLowerCase();
        documents = documents.filter((d) => d.title.toLowerCase().includes(search));
      }

      documents = [...documents].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );

      const offset = params?.offset ?? 0;
      const limit = params?.limit ?? 100;
      return { documents: documents.slice(offset, offset + limit) };
    }

    const { data, error } = await supabase
      .from('prd_documents')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(params?.limit || 100);

    if (error) throw error;

    let documents = data || [];

    // Apply filters
    if (params?.projectId) {
      documents = documents.filter((d) => d.project_id === params.projectId);
    }
    if (params?.status) {
      documents = documents.filter((d) => d.status === params.status);
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      documents = documents.filter((d) => d.title.toLowerCase().includes(search));
    }

    console.log('✅ Documents fetched:', documents.length);
    return { documents };
  } catch (error) {
    console.error('❌ Failed to fetch documents:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch documents');
  }
}

export async function getDocument(documentId: string): Promise<GetDocumentResponse> {
  try {
    console.log('📄 getDocument called for:', documentId);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    if (!authed) {
      const documents = readGuestJson<PRDDocument[]>(GUEST_STORAGE_KEYS.documents, []).filter(
        (d) => d.owner_id === userId
      );
      const document = documents.find((d) => d.id === documentId);
      if (!document) throw new Error('Document not found');
      return { document };
    }

    const { data: document, error } = await supabase
      .from('prd_documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', userId)
      .single();

    if (error) throw error;

    console.log('✅ Document fetched:', document);
    return { document };
  } catch (error) {
    console.error('❌ Failed to fetch document:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch document');
  }
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

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  sections: string[];
  visibility?: 'private' | 'public';
}

export interface UpdateTemplateRequest {
  templateId: string;
  name?: string;
  description?: string;
  sections?: string[];
  visibility?: 'private' | 'public';
}

export async function getTemplates(params?: {
  limit?: number;
  visibility?: string;
}): Promise<GetTemplatesResponse> {
  try {
    console.log('📚 getTemplates API called with params:', params);

    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('is_custom', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(params?.limit || 100);

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    // Guest mode: only show built-ins from backend + this browser's custom templates
    if (!authed) {
      const builtIns = (data || []).filter((t) => !t.is_custom);
      const localCustoms = readGuestJson<Template[]>(GUEST_STORAGE_KEYS.templates, []).filter(
        (t) => t.user_id === userId
      );

      const merged = [...builtIns, ...localCustoms];
      return { templates: merged.slice(0, params?.limit || 100) };
    }

    console.log('✅ Templates fetched successfully:', data?.length || 0);
    return { templates: data || [] };
  } catch (err) {
    console.error('❌ Failed to fetch templates:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch templates');
  }
}

export async function createTemplate(
  data: CreateTemplateRequest
): Promise<{ template: Template }> {
  const authed = await isAuthenticated();
  const userId = await getCurrentUserId();

  if (!authed) {
    const now = new Date().toISOString();
    const template: Template = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description ?? null,
      sections: data.sections,
      is_custom: true,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };

    const templates = readGuestJson<Template[]>(GUEST_STORAGE_KEYS.templates, []);
    writeGuestJson(GUEST_STORAGE_KEYS.templates, [template, ...templates]);
    return { template };
  }

  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      name: data.name,
      description: data.description,
      sections: data.sections, // Correct column name
      is_custom: true,
      user_id: userId, // Correct column name
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Create template error:', error);
    throw error;
  }
  return { template };
}

export async function updateTemplate(
  data: UpdateTemplateRequest
): Promise<{ template: Template }> {
  const authed = await isAuthenticated();
  const userId = await getCurrentUserId();

  if (!authed) {
    const templates = readGuestJson<Template[]>(GUEST_STORAGE_KEYS.templates, []).filter(
      (t) => t.user_id === userId
    );
    const existing = templates.find((t) => t.id === data.templateId);
    if (!existing) throw new Error('Template not found');

    const now = new Date().toISOString();
    const updated: Template = {
      ...existing,
      name: data.name ?? existing.name,
      description:
        data.description !== undefined ? data.description ?? null : existing.description,
      sections: data.sections ?? (existing.sections as any),
      updated_at: now,
    };

    writeGuestJson(
      GUEST_STORAGE_KEYS.templates,
      [updated, ...templates.filter((t) => t.id !== data.templateId)]
    );

    return { template: updated };
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.sections) updateData.sections = data.sections; // Correct column name

  const { data: template, error } = await supabase
    .from('templates')
    .update(updateData)
    .eq('id', data.templateId)
    .eq('user_id', userId) // Ensure user owns this template
    .select()
    .single();

  if (error) {
    console.error('❌ Update template error:', error);
    throw error;
  }
  return { template };
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const authed = await isAuthenticated();
  const userId = await getCurrentUserId();

  if (!authed) {
    const templates = readGuestJson<Template[]>(GUEST_STORAGE_KEYS.templates, []).filter(
      (t) => t.user_id === userId
    );
    writeGuestJson(
      GUEST_STORAGE_KEYS.templates,
      templates.filter((t) => t.id !== templateId)
    );
    return;
  }

  const { error } = await supabase.from('templates').delete().eq('id', templateId);

  if (error) throw error;
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
    const authed = await isAuthenticated();
    const userId = await getCurrentUserId();

    if (!authed) {
      let projects = readGuestJson<Project[]>(GUEST_STORAGE_KEYS.projects, []).filter(
        (p) => p.user_id === userId
      );

      if (params?.search) {
        const search = params.search.toLowerCase();
        projects = projects.filter((p) => p.name.toLowerCase().includes(search));
      }

      projects = [...projects].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );

      return { projects: projects.slice(0, params?.limit || 100) };
    }

    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
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
  const authed = await isAuthenticated();
  const userId = await getCurrentUserId();

  if (!authed) {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: data.name,
      description: data.description ?? null,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const projects = readGuestJson<Project[]>(GUEST_STORAGE_KEYS.projects, []).filter(
      (p) => p.user_id === userId
    );
    writeGuestJson(GUEST_STORAGE_KEYS.projects, [project, ...projects]);
    return { project };
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      description: data.description,
      user_id: userId, // Correct column name
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Create project error:', error);
    throw error;
  }
  return { project };
}

export async function updateProject(
  data: UpdateProjectRequest
): Promise<{ project: Project }> {
  const authed = await isAuthenticated();
  const userId = await getCurrentUserId();

  if (!authed) {
    const projects = readGuestJson<Project[]>(GUEST_STORAGE_KEYS.projects, []).filter(
      (p) => p.user_id === userId
    );
    const existing = projects.find((p) => p.id === data.projectId);
    if (!existing) throw new Error('Project not found');

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      name: data.name ?? existing.name,
      description:
        data.description !== undefined ? data.description ?? null : existing.description,
      updated_at: now,
    };

    writeGuestJson(
      GUEST_STORAGE_KEYS.projects,
      [updated, ...projects.filter((p) => p.id !== data.projectId)]
    );

    return { project: updated };
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', data.projectId)
    .eq('user_id', userId) // Ensure user owns this project
    .select()
    .single();

  if (error) {
    console.error('❌ Update project error:', error);
    throw error;
  }
  return { project };
}

export async function deleteProject(projectId: string): Promise<void> {
  const authed = await isAuthenticated();
  const userId = await getCurrentUserId();

  if (!authed) {
    const projects = readGuestJson<Project[]>(GUEST_STORAGE_KEYS.projects, []).filter(
      (p) => p.user_id === userId
    );
    writeGuestJson(
      GUEST_STORAGE_KEYS.projects,
      projects.filter((p) => p.id !== projectId)
    );
    return;
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId);

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

// =====================================================
// INTEGRATIONS API
// =====================================================

export interface GetIntegrationsResponse {
  integrations: Integration[];
}

export interface ConnectIntegrationRequest {
  provider: 'confluence' | 'linear' | 'gamma' | 'napkin';
  credentials: {
    access_token?: string;
    refresh_token?: string;
    api_key?: string;
  };
  config?: {
    scopes?: string[];
    workspace_id?: string;
    workspace_name?: string;
    [key: string]: any;
  };
}

export interface UpdateIntegrationRequest {
  integrationId: string;
  config?: any;
  isActive?: boolean;
}

export async function getIntegrations(): Promise<GetIntegrationsResponse> {
  // TODO: Implement when integrations table is created
  console.warn('getIntegrations: integrations table not available yet');
  return { integrations: [] };
}

export async function connectIntegration(
  data: ConnectIntegrationRequest
): Promise<{ integration: Integration }> {
  // TODO: Implement when integrations table is created
  console.warn('connectIntegration: integrations table not available yet');
  throw new Error('Integrations feature not available yet. Database tables need to be created.');
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  // TODO: Implement when integrations table is created
  console.warn('disconnectIntegration: integrations table not available yet');
  throw new Error('Integrations feature not available yet. Database tables need to be created.');
}

export async function updateIntegration(
  data: UpdateIntegrationRequest
): Promise<{ integration: Integration }> {
  // TODO: Implement when integrations table is created
  console.warn('updateIntegration: integrations table not available yet');
  throw new Error('Integrations feature not available yet. Database tables need to be created.');
}

// OAuth configuration for each integration
export const INTEGRATION_CONFIG = {
  confluence: {
    name: 'Confluence',
    icon: '📄',
    description: 'Export PRDs to Confluence pages',
    category: 'export',
    scopes: [
      'read:confluence-content.all',
      'write:confluence-content',
      'read:confluence-space.summary',
      'write:confluence-space',
    ],
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
  },
  linear: {
    name: 'Linear',
    icon: '🔷',
    description: 'Create Linear issues from PRDs',
    category: 'export',
    scopes: ['read', 'write'],
    authUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
  },
  gamma: {
    name: 'Gamma',
    icon: '🎨',
    description: 'Generate presentations from PRDs',
    category: 'export',
    scopes: ['read:documents', 'write:documents'],
    authUrl: 'https://gamma.app/oauth/authorize',
    tokenUrl: 'https://api.gamma.app/oauth/token',
  },
  napkin: {
    name: 'Napkin AI',
    icon: '✏️',
    description: 'Create visual diagrams from PRDs',
    category: 'export',
    scopes: ['read:projects', 'write:diagrams'],
    authUrl: 'https://napkin.ai/oauth/authorize',
    tokenUrl: 'https://api.napkin.ai/oauth/token',
  },
} as const;
