// =====================================================
// Database Types - Auto-generated from Supabase Schema
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          visibility: 'private' | 'public'
          team_id: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          visibility?: 'private' | 'public'
          team_id?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          visibility?: 'private' | 'public'
          team_id?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          sections_json: Json
          is_custom: boolean
          visibility: 'private' | 'public'
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sections_json?: Json
          is_custom?: boolean
          visibility?: 'private' | 'public'
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sections_json?: Json
          is_custom?: boolean
          visibility?: 'private' | 'public'
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prd_documents: {
        Row: {
          id: string
          title: string
          content_markdown: string | null
          content_json: Json | null
          status: 'draft' | 'final' | 'archived'
          visibility: 'private' | 'public'
          project_id: string | null
          template_id: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content_markdown?: string | null
          content_json?: Json | null
          status?: 'draft' | 'final' | 'archived'
          visibility?: 'private' | 'public'
          project_id?: string | null
          template_id?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content_markdown?: string | null
          content_json?: Json | null
          status?: 'draft' | 'final' | 'archived'
          visibility?: 'private' | 'public'
          project_id?: string | null
          template_id?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          title: string | null
          user_id: string
          project_id: string | null
          prd_document_id: string | null
          settings_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          user_id: string
          project_id?: string | null
          prd_document_id?: string | null
          settings_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          user_id?: string
          project_id?: string | null
          prd_document_id?: string | null
          settings_json?: Json
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          attachments_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          attachments_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          attachments_json?: Json
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          provider: 'confluence' | 'linear' | 'gamma' | 'napkin'
          credentials_encrypted: string | null
          config_json: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'confluence' | 'linear' | 'gamma' | 'napkin'
          credentials_encrypted?: string | null
          config_json?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'confluence' | 'linear' | 'gamma' | 'napkin'
          credentials_encrypted?: string | null
          config_json?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      exports: {
        Row: {
          id: string
          prd_document_id: string
          user_id: string
          provider: 'confluence' | 'linear' | 'gamma' | 'napkin'
          external_id: string | null
          external_url: string | null
          metadata_json: Json
          status: 'pending' | 'success' | 'failed'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prd_document_id: string
          user_id: string
          provider: 'confluence' | 'linear' | 'gamma' | 'napkin'
          external_id?: string | null
          external_url?: string | null
          metadata_json?: Json
          status?: 'pending' | 'success' | 'failed'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prd_document_id?: string
          user_id?: string
          provider?: 'confluence' | 'linear' | 'gamma' | 'napkin'
          external_id?: string | null
          external_url?: string | null
          metadata_json?: Json
          status?: 'pending' | 'success' | 'failed'
          error_message?: string | null
          created_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          action_type: 'prd_generation' | 'export' | 'chat_message' | 'file_upload'
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: 'prd_generation' | 'export' | 'chat_message' | 'file_upload'
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: 'prd_generation' | 'export' | 'chat_message' | 'file_upload'
          metadata_json?: Json
          created_at?: string
        }
      }
      file_attachments: {
        Row: {
          id: string
          user_id: string
          chat_message_id: string | null
          file_name: string
          file_type: string
          file_size_bytes: number
          storage_path: string
          extracted_content: string | null
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_message_id?: string | null
          file_name: string
          file_type: string
          file_size_bytes: number
          storage_path: string
          extracted_content?: string | null
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_message_id?: string | null
          file_name?: string
          file_type?: string
          file_size_bytes?: number
          storage_path?: string
          extracted_content?: string | null
          metadata_json?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type PRDDocument = Database['public']['Tables']['prd_documents']['Row']
export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type Integration = Database['public']['Tables']['integrations']['Row']
export type Export = Database['public']['Tables']['exports']['Row']
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']
export type FileAttachment = Database['public']['Tables']['file_attachments']['Row']

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type TemplateInsert = Database['public']['Tables']['templates']['Insert']
export type PRDDocumentInsert = Database['public']['Tables']['prd_documents']['Insert']
export type ChatInsert = Database['public']['Tables']['chats']['Insert']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type IntegrationInsert = Database['public']['Tables']['integrations']['Insert']
export type ExportInsert = Database['public']['Tables']['exports']['Insert']
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert']
export type FileAttachmentInsert = Database['public']['Tables']['file_attachments']['Insert']

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type TemplateUpdate = Database['public']['Tables']['templates']['Update']
export type PRDDocumentUpdate = Database['public']['Tables']['prd_documents']['Update']
export type ChatUpdate = Database['public']['Tables']['chats']['Update']
export type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update']
export type IntegrationUpdate = Database['public']['Tables']['integrations']['Update']
export type ExportUpdate = Database['public']['Tables']['exports']['Update']
