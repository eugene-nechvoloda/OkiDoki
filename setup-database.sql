-- Copy this ENTIRE file and paste it into Supabase SQL Editor
-- This will create all 11 tables, security policies, and seed templates

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON public.users(email);

-- Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_teams_owner_id ON public.teams(owner_id);

-- Team members table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- Projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_team_id ON public.projects(team_id);

-- Templates table
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sections_json JSONB NOT NULL DEFAULT '[]',
    is_custom BOOLEAN NOT NULL DEFAULT false,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_templates_owner_id ON public.templates(owner_id);

-- PRD documents table
CREATE TABLE public.prd_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content_markdown TEXT,
    content_json JSONB,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prd_documents_owner_id ON public.prd_documents(owner_id);
CREATE INDEX idx_prd_documents_search ON public.prd_documents USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content_markdown, ''))
);

-- Chats table
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    prd_document_id UUID REFERENCES public.prd_documents(id) ON DELETE SET NULL,
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chats_user_id ON public.chats(user_id);
CREATE INDEX idx_chats_created_at ON public.chats(created_at DESC);

-- Chat messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    attachments_json JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);

-- Integrations table
CREATE TABLE public.integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('confluence', 'linear', 'gamma', 'napkin')),
    credentials_encrypted TEXT,
    config_json JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider)
);
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);

-- Exports table
CREATE TABLE public.exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prd_document_id UUID NOT NULL REFERENCES public.prd_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('confluence', 'linear', 'gamma', 'napkin')),
    external_id TEXT,
    external_url TEXT,
    metadata_json JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exports_prd_document_id ON public.exports(prd_document_id);

-- Usage tracking table
CREATE TABLE public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('prd_generation', 'export', 'chat_message', 'file_upload')),
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);

-- File attachments table
CREATE TABLE public.file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chat_message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    extracted_content TEXT,
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_file_attachments_user_id ON public.file_attachments(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prd_documents_updated_at BEFORE UPDATE ON public.prd_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their teams" ON public.teams FOR SELECT USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = id AND user_id = auth.uid()));
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Team owners can update" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Team owners can delete" ON public.teams FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view their projects" ON public.projects FOR SELECT USING (auth.uid() = owner_id OR visibility = 'public');
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view templates" ON public.templates FOR SELECT USING (visibility = 'public' OR (is_custom = true AND owner_id = auth.uid()));
CREATE POLICY "Users can create templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = owner_id AND is_custom = true);
CREATE POLICY "Users can update own templates" ON public.templates FOR UPDATE USING (auth.uid() = owner_id AND is_custom = true);
CREATE POLICY "Users can delete own templates" ON public.templates FOR DELETE USING (auth.uid() = owner_id AND is_custom = true);

CREATE POLICY "Users can view PRDs" ON public.prd_documents FOR SELECT USING (auth.uid() = owner_id OR visibility = 'public');
CREATE POLICY "Users can create PRDs" ON public.prd_documents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own PRDs" ON public.prd_documents FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own PRDs" ON public.prd_documents FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON public.chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.chats FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND user_id = auth.uid()));
CREATE POLICY "Users can create messages" ON public.chat_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own integrations" ON public.integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create integrations" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON public.integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations" ON public.integrations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own exports" ON public.exports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create exports" ON public.exports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON public.usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create usage" ON public.usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own files" ON public.file_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create files" ON public.file_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON public.file_attachments FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own files" ON storage.objects FOR SELECT USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed built-in templates
INSERT INTO public.templates (name, description, sections_json, is_custom, visibility) VALUES
('Standard PRD', 'Comprehensive product requirements document', '["Executive Summary", "Problem Statement", "Goals & Non-Goals", "Users & Personas", "Use Cases", "Requirements", "Acceptance Criteria", "UX Flows", "Success Metrics", "Risks & Assumptions", "Open Questions"]'::jsonb, false, 'public'),
('Discovery Brief', 'Research and exploration documentation', '["Context", "Research Questions", "Hypotheses", "Research Plan", "Key Signals to Validate", "Findings", "Recommendations", "Next Steps"]'::jsonb, false, 'public'),
('Experiment PRD', 'A/B test and experiment documentation', '["Hypothesis", "Experiment Design", "Success Metrics", "Sample Size & Power Analysis", "Procedure", "Risks & Mitigation", "Post-Analysis Plan"]'::jsonb, false, 'public'),
('RFC (Request for Comments)', 'Lightweight technical proposal', '["Proposal", "Rationale", "Alternatives Considered", "Impact Analysis", "Rollout Plan", "Decision & Sign-off"]'::jsonb, false, 'public'),
('API Documentation', 'Technical API specification', '["Overview", "Authentication", "Endpoints", "Request/Response Formats", "Error Codes", "Rate Limiting", "Examples", "Changelog"]'::jsonb, false, 'public'),
('Competitive Analysis', 'Market and competitor research', '["Market Overview", "Competitors", "Feature Comparison", "Pricing Analysis", "Strengths & Weaknesses", "Opportunities & Threats", "Strategic Recommendations"]'::jsonb, false, 'public');
