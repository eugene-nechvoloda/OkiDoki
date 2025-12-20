// =====================================================
// Database Types - Matches actual Supabase Schema
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
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          sections: string[] | null
          is_custom: boolean
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sections?: string[] | null
          is_custom?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sections?: string[] | null
          is_custom?: boolean
          user_id?: string | null
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
          status: string | null
          visibility: string | null
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
          status?: string | null
          visibility?: string | null
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
          status?: string | null
          visibility?: string | null
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
          messages_json: Json | null
          settings_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          user_id: string
          messages_json?: Json | null
          settings_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          user_id?: string
          messages_json?: Json | null
          settings_json?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          config_json: Json | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          config_json?: Json | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          config_json?: Json | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          action_type: string
          metadata_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          metadata_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          metadata_json?: Json | null
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
export type Project = Database['public']['Tables']['projects']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type PRDDocument = Database['public']['Tables']['prd_documents']['Row']
export type Chat = Database['public']['Tables']['chats']['Row']
export type Integration = Database['public']['Tables']['integrations']['Row']
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']

// Insert types
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type TemplateInsert = Database['public']['Tables']['templates']['Insert']
export type PRDDocumentInsert = Database['public']['Tables']['prd_documents']['Insert']
export type ChatInsert = Database['public']['Tables']['chats']['Insert']
export type IntegrationInsert = Database['public']['Tables']['integrations']['Insert']
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert']

// Update types
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type TemplateUpdate = Database['public']['Tables']['templates']['Update']
export type PRDDocumentUpdate = Database['public']['Tables']['prd_documents']['Update']
export type ChatUpdate = Database['public']['Tables']['chats']['Update']
export type IntegrationUpdate = Database['public']['Tables']['integrations']['Update']

// Legacy types for compatibility (can be removed later)
export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type ChatMessageInsert = ChatMessage

export type FileAttachment = {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
}
