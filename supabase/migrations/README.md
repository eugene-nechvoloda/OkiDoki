# Database Migrations

## How to Apply Migrations

Since the Supabase CLI installation failed due to network issues, you have two options:

### Option 1: Using Supabase Dashboard (Recommended for now)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/itaacfxqowbweibgxbqo
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `20241208000000_initial_schema.sql`
5. Paste into the query editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI (When network is available)

```bash
# Link to your remote project
npx supabase link --project-ref itaacfxqowbweibgxbqo

# Push the migration
npx supabase db push
```

## What This Migration Creates

- **11 Tables**: users, teams, team_members, projects, templates, prd_documents, chats, chat_messages, integrations, exports, usage_tracking, file_attachments
- **Row Level Security (RLS)**: Full multi-tenant data isolation
- **Triggers**: Auto-update timestamps, auto-create user profiles
- **Indexes**: Optimized for common queries
- **Storage Bucket**: For file uploads
- **Built-in Templates**: 6 default PRD templates

## After Migration

Update your TypeScript types by running:
```bash
npm run generate-types
```

This will auto-generate types from the database schema.
