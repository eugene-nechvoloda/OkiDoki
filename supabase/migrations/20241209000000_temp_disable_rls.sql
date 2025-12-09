-- TEMPORARY: Disable RLS for testing
-- TODO: Remove this migration once OAuth is fixed

-- Create mock user for testing (matches the mock user in AuthProvider)
INSERT INTO public.users (id, email, name, created_at, updated_at)
VALUES (
  'test-user-id',
  'test@example.com',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Disable RLS on all tables temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments DISABLE ROW LEVEL SECURITY;
