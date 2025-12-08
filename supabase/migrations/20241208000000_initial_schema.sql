-- =====================================================
-- OkiDoki PRD Agent - Initial Database Schema
-- =====================================================
-- This migration creates the complete database schema for the OkiDoki PRD Agent
-- including tables, indexes, RLS policies, and necessary functions.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Extended user profile (synced with auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON public.users(email);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX idx_teams_owner_id ON public.teams(owner_id);

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Indexes for lookups
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
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

-- Indexes for lookups
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_projects_visibility ON public.projects(visibility);

-- =====================================================
-- TEMPLATES TABLE
-- =====================================================
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

-- Indexes for lookups
CREATE INDEX idx_templates_owner_id ON public.templates(owner_id);
CREATE INDEX idx_templates_is_custom ON public.templates(is_custom);
CREATE INDEX idx_templates_visibility ON public.templates(visibility);

-- =====================================================
-- PRD DOCUMENTS TABLE
-- =====================================================
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

-- Indexes for lookups and full-text search
CREATE INDEX idx_prd_documents_owner_id ON public.prd_documents(owner_id);
CREATE INDEX idx_prd_documents_project_id ON public.prd_documents(project_id);
CREATE INDEX idx_prd_documents_template_id ON public.prd_documents(template_id);
CREATE INDEX idx_prd_documents_status ON public.prd_documents(status);
CREATE INDEX idx_prd_documents_visibility ON public.prd_documents(visibility);
CREATE INDEX idx_prd_documents_created_at ON public.prd_documents(created_at DESC);

-- Full-text search index on title and content
CREATE INDEX idx_prd_documents_search ON public.prd_documents USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content_markdown, ''))
);

-- =====================================================
-- CHATS TABLE
-- =====================================================
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

-- Indexes for lookups
CREATE INDEX idx_chats_user_id ON public.chats(user_id);
CREATE INDEX idx_chats_project_id ON public.chats(project_id);
CREATE INDEX idx_chats_prd_document_id ON public.chats(prd_document_id);
CREATE INDEX idx_chats_created_at ON public.chats(created_at DESC);

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    attachments_json JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lookups
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- =====================================================
-- INTEGRATIONS TABLE
-- =====================================================
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

-- Indexes for lookups
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);

-- =====================================================
-- EXPORTS TABLE
-- =====================================================
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

-- Indexes for lookups
CREATE INDEX idx_exports_prd_document_id ON public.exports(prd_document_id);
CREATE INDEX idx_exports_user_id ON public.exports(user_id);
CREATE INDEX idx_exports_provider ON public.exports(provider);
CREATE INDEX idx_exports_created_at ON public.exports(created_at DESC);

-- =====================================================
-- USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('prd_generation', 'export', 'chat_message', 'file_upload')),
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_action_type ON public.usage_tracking(action_type);
CREATE INDEX idx_usage_tracking_created_at ON public.usage_tracking(created_at DESC);

-- =====================================================
-- FILE ATTACHMENTS TABLE
-- =====================================================
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

-- Indexes for lookups
CREATE INDEX idx_file_attachments_user_id ON public.file_attachments(user_id);
CREATE INDEX idx_file_attachments_chat_message_id ON public.file_attachments(chat_message_id);
CREATE INDEX idx_file_attachments_created_at ON public.file_attachments(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
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

-- Function to create user profile on signup
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

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
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

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- TEAMS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view teams they own or are members of"
    ON public.teams FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create teams"
    ON public.teams FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams"
    ON public.teams FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams"
    ON public.teams FOR DELETE
    USING (auth.uid() = owner_id);

-- =====================================================
-- TEAM MEMBERS TABLE POLICIES
-- =====================================================
CREATE POLICY "Team members can view other members in their teams"
    ON public.team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team owners can add members"
    ON public.team_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = team_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Team owners can remove members"
    ON public.team_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = team_id AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own projects"
    ON public.projects FOR SELECT
    USING (
        auth.uid() = owner_id
        OR visibility = 'public'
        OR (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = projects.team_id AND user_id = auth.uid()
        ))
    );

CREATE POLICY "Users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = owner_id);

-- =====================================================
-- TEMPLATES TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view public templates and their own custom templates"
    ON public.templates FOR SELECT
    USING (
        visibility = 'public'
        OR (is_custom = true AND owner_id = auth.uid())
    );

CREATE POLICY "Users can create custom templates"
    ON public.templates FOR INSERT
    WITH CHECK (auth.uid() = owner_id AND is_custom = true);

CREATE POLICY "Users can update their own custom templates"
    ON public.templates FOR UPDATE
    USING (auth.uid() = owner_id AND is_custom = true);

CREATE POLICY "Users can delete their own custom templates"
    ON public.templates FOR DELETE
    USING (auth.uid() = owner_id AND is_custom = true);

-- =====================================================
-- PRD DOCUMENTS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own PRDs"
    ON public.prd_documents FOR SELECT
    USING (
        auth.uid() = owner_id
        OR visibility = 'public'
        OR (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = prd_documents.project_id
            AND (
                owner_id = auth.uid()
                OR (team_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.team_members
                    WHERE team_id = projects.team_id AND user_id = auth.uid()
                ))
            )
        ))
    );

CREATE POLICY "Users can create PRDs"
    ON public.prd_documents FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own PRDs"
    ON public.prd_documents FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own PRDs"
    ON public.prd_documents FOR DELETE
    USING (auth.uid() = owner_id);

-- =====================================================
-- CHATS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own chats"
    ON public.chats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create chats"
    ON public.chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
    ON public.chats FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
    ON public.chats FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- CHAT MESSAGES TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view messages in their own chats"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE id = chat_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their own chats"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE id = chat_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages in their own chats"
    ON public.chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.chats
            WHERE id = chat_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- INTEGRATIONS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own integrations"
    ON public.integrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
    ON public.integrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
    ON public.integrations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
    ON public.integrations FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- EXPORTS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own exports"
    ON public.exports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create exports"
    ON public.exports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USAGE TRACKING TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own usage tracking"
    ON public.usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create usage tracking entries"
    ON public.usage_tracking FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FILE ATTACHMENTS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view their own file attachments"
    ON public.file_attachments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create file attachments"
    ON public.file_attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file attachments"
    ON public.file_attachments FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads bucket
CREATE POLICY "Users can upload their own files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'uploads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'uploads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'uploads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert built-in templates
INSERT INTO public.templates (name, description, sections_json, is_custom, visibility) VALUES
(
    'Standard PRD',
    'Comprehensive product requirements document template',
    '["Executive Summary", "Problem Statement", "Goals & Non-Goals", "Users & Personas", "Use Cases", "Requirements", "Acceptance Criteria", "UX Flows", "Success Metrics", "Risks & Assumptions", "Open Questions"]'::jsonb,
    false,
    'public'
),
(
    'Discovery Brief',
    'Research and exploration documentation template',
    '["Context", "Research Questions", "Hypotheses", "Research Plan", "Key Signals to Validate", "Findings", "Recommendations", "Next Steps"]'::jsonb,
    false,
    'public'
),
(
    'Experiment PRD',
    'A/B test and experiment documentation template',
    '["Hypothesis", "Experiment Design", "Success Metrics", "Sample Size & Power Analysis", "Procedure", "Risks & Mitigation", "Post-Analysis Plan"]'::jsonb,
    false,
    'public'
),
(
    'RFC (Request for Comments)',
    'Lightweight technical proposal template',
    '["Proposal", "Rationale", "Alternatives Considered", "Impact Analysis", "Rollout Plan", "Decision & Sign-off"]'::jsonb,
    false,
    'public'
),
(
    'API Documentation',
    'Technical API specification template',
    '["Overview", "Authentication", "Endpoints", "Request/Response Formats", "Error Codes", "Rate Limiting", "Examples", "Changelog"]'::jsonb,
    false,
    'public'
),
(
    'Competitive Analysis',
    'Market and competitor research template',
    '["Market Overview", "Competitors", "Feature Comparison", "Pricing Analysis", "Strengths & Weaknesses", "Opportunities & Threats", "Strategic Recommendations"]'::jsonb,
    false,
    'public'
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.users IS 'Extended user profiles synced with auth.users';
COMMENT ON TABLE public.teams IS 'Team/organization management';
COMMENT ON TABLE public.team_members IS 'Team membership and roles';
COMMENT ON TABLE public.projects IS 'Projects containing multiple PRDs';
COMMENT ON TABLE public.templates IS 'Built-in and custom PRD templates';
COMMENT ON TABLE public.prd_documents IS 'Generated PRD documents';
COMMENT ON TABLE public.chats IS 'Chat sessions for PRD generation';
COMMENT ON TABLE public.chat_messages IS 'Individual messages in chat sessions';
COMMENT ON TABLE public.integrations IS 'Third-party integration credentials';
COMMENT ON TABLE public.exports IS 'Export history to external platforms';
COMMENT ON TABLE public.usage_tracking IS 'User activity and usage analytics';
COMMENT ON TABLE public.file_attachments IS 'Uploaded files and extracted content';
