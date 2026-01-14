-- Knowledge Base Tables
-- Stores documents and web sources for RAG-enhanced PRD generation

-- Create knowledge_documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  content_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_web_sources table
CREATE TABLE IF NOT EXISTS knowledge_web_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  last_crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_web_sources_user_id ON knowledge_web_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_web_sources_created_at ON knowledge_web_sources(created_at DESC);

-- Enable full-text search on content
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_content_text ON knowledge_documents USING gin(to_tsvector('english', content_text));
CREATE INDEX IF NOT EXISTS idx_knowledge_web_sources_content_text ON knowledge_web_sources USING gin(to_tsvector('english', content_text));

-- Create storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_web_sources ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "Users can view their own documents"
  ON knowledge_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON knowledge_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON knowledge_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON knowledge_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only see their own web sources
CREATE POLICY "Users can view their own web sources"
  ON knowledge_web_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own web sources"
  ON knowledge_web_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own web sources"
  ON knowledge_web_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own web sources"
  ON knowledge_web_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "Users can upload their own knowledge files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own knowledge files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own knowledge files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER update_knowledge_web_sources_updated_at
  BEFORE UPDATE ON knowledge_web_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();
