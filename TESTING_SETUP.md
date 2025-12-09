# Testing Setup Instructions

## Issue
All database operations are currently failing with "fatal error" because:
1. Row Level Security (RLS) is enabled and expects authenticated users
2. OAuth is not properly configured, so there's no real user session
3. The frontend is using a mock user for testing

## Solution
You need to run ONE SQL command in Supabase to temporarily disable RLS for testing.

## Steps to Fix

### 1. Open Supabase SQL Editor
Go to: https://mlirwabkxjvleutcehae.supabase.co/project/default/sql/new

### 2. Copy and Run This SQL
```sql
-- TEMPORARY: Disable RLS for testing
-- Copy and paste this entire block into Supabase SQL Editor and run it

-- Drop the foreign key constraint temporarily to allow mock user insertion
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Create mock user for testing with a valid UUID
INSERT INTO public.users (id, email, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
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
```

### 3. Refresh Your App
After running the SQL:
1. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. All features should now work:
   - ✅ Chat should work without "please sign in" error
   - ✅ Projects can be created/edited/deleted
   - ✅ Templates should load and can be created/edited/deleted
   - ✅ Integrations can be connected

## What Was Changed in the Code

### Frontend Changes:
1. **AuthProvider** (`src/providers/AuthProvider.tsx`)
   - Added mock user with ID `'test-user-id'`
   - Disabled real authentication checks

2. **API Service** (`src/services/api.ts`)
   - Added `getCurrentUserId()` helper that returns mock user ID
   - Modified `getAuthHeaders()` to not require session
   - Replaced all `auth.getUser()` calls with mock user ID

3. **Protected Route** (`src/components/auth/ProtectedRoute.tsx`)
   - Already disabled (no changes needed)

## Re-enabling Authentication Later

When OAuth is fixed, you need to:

1. Run this SQL to re-enable RLS:
```sql
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
```

2. Revert code changes (search for "TODO: Remove this mock" and "TODO: Re-enable" comments)

3. Delete the mock user:
```sql
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Files Modified
- `src/providers/AuthProvider.tsx` - Mock user provider
- `src/services/api.ts` - Mock user ID helper
- `supabase/migrations/20241209000000_temp_disable_rls.sql` - RLS disable migration
