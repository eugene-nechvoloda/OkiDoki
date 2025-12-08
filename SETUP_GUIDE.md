# 🚀 OkiDoki PRD Agent - Quick Setup Guide

Since your Supabase project doesn't exist, follow these steps to get everything running.

---

## ⚡ Quick Setup (15 minutes)

### **Step 1: Create Supabase Project** (3 min)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `okidoki-prd-agent`
   - **Database Password:** (generate and save it!)
   - **Region:** Choose closest to you
   - **Plan:** Free
4. Click **"Create new project"**
5. ⏰ Wait ~2 minutes for provisioning

### **Step 2: Get Credentials** (1 min)

Once ready:
1. Go to **Settings** (⚙️) → **API**
2. Copy these 3 values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project Reference ID**: `xxxxx`
   - **anon public key**: Long JWT starting with `eyJ...`

### **Step 3: Update Configuration** (2 min)

Run the setup script and paste your credentials:

```bash
./setup-supabase.sh
```

Or manually update `.env`:
```bash
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

And `supabase/config.toml`:
```toml
project_id = "your-project-id"
```

### **Step 4: Apply Database Migration** (2 min)

1. Open: `https://YOUR-PROJECT-ID.supabase.co` (replace with yours)
2. Go to **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Open `supabase/migrations/20241208000000_initial_schema.sql` in your editor
5. Copy ALL contents (it's 600+ lines)
6. Paste into Supabase SQL Editor
7. Click **"RUN"** (bottom right)

✅ You should see: "Success. No rows returned"

This creates:
- 11 database tables
- All RLS policies
- 6 built-in templates
- Storage bucket for files

### **Step 5: Get Google OAuth Credentials** (5 min)

#### **5a. Create Google OAuth App**
1. Go to https://console.cloud.google.com
2. Create project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
5. Configure consent screen if prompted (just add app name)
6. Application type: **Web application**
7. Add **Authorized redirect URIs**:
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   http://localhost:5173
   ```
8. Click **"CREATE"**
9. Copy **Client ID** and **Client Secret**

#### **5b. Configure in Supabase**
1. Go to Supabase **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **"Enabled"** to ON
4. Paste:
   - **Client ID** (from Google)
   - **Client Secret** (from Google)
5. Click **"Save"**

### **Step 6: Set Anthropic API Key** (1 min)

1. Go to Supabase **Project Settings** → **Edge Functions**
2. Scroll to **"Function secrets"**
3. Click **"Add new secret"**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your Claude API key (get from https://console.anthropic.com/)
6. Click **"Create secret"**

### **Step 7: Deploy Edge Functions** (5 min)

Link your project and deploy:

```bash
# Link to remote project
npx supabase link --project-ref YOUR-PROJECT-ID

# Deploy all functions
npx supabase functions deploy generate-prd
npx supabase functions deploy save-chat
npx supabase functions deploy get-chats
npx supabase functions deploy save-document
npx supabase functions deploy get-documents
npx supabase functions deploy process-file
```

Or deploy all at once:
```bash
npx supabase functions deploy
```

### **Step 8: Run the App!** 🎉

```bash
npm run dev
```

Open http://localhost:5173

---

## ✅ Testing Your Setup

### **Test 1: Authentication**
1. Visit http://localhost:5173
2. Should redirect to `/login`
3. Click **"Continue with Google"**
4. Sign in with Google
5. Should redirect back to chat interface
6. See your name/avatar in bottom-left sidebar

### **Test 2: PRD Generation**
1. Type: "Create a PRD for a mobile task management app"
2. Hit Enter
3. Should see streaming response from Claude
4. PRD appears in right panel
5. Refresh page → Chat should still be there (persisted!)

### **Test 3: File Upload**
1. Click paperclip icon in chat input
2. Upload an image or PDF
3. Should process and extract content
4. Send a message using that file context

---

## 🐛 Troubleshooting

### **"Failed to fetch" errors**
- Check all edge functions are deployed: `npx supabase functions list`
- Verify ANTHROPIC_API_KEY is set in Supabase secrets
- Check browser console for detailed error

### **"Unauthorized" errors**
- Make sure you're signed in via Google OAuth
- Check that Google OAuth is enabled in Supabase
- Verify redirect URIs are correct

### **"No authorization header" errors**
- Session might have expired - sign out and back in
- Check that `verify_jwt = true` in config.toml for all functions

### **Database errors**
- Verify migration was applied successfully
- Check Supabase **Table Editor** - should see 11 tables
- Check **SQL Editor** → **History** for any failed queries

### **Still stuck?**
1. Check Supabase logs: **Logs** → **Edge Functions**
2. Check browser console (F12)
3. Verify all environment variables are set correctly

---

## 📊 Verify Everything Works

After setup, you should have:

- ✅ Supabase project created
- ✅ 11 database tables with data
- ✅ Google OAuth configured
- ✅ 6 edge functions deployed
- ✅ Anthropic API key set
- ✅ App running on localhost:5173
- ✅ Can sign in with Google
- ✅ Can generate PRDs with Claude
- ✅ Chats persist after refresh

---

## 🎯 What You Get

Once setup is complete, your app can:

1. **Authenticate** - Google OAuth sign-in
2. **Generate PRDs** - Using Claude Sonnet 4.5
3. **Save Everything** - Chats and PRDs persist in database
4. **Process Files** - Upload PDFs, images, documents
5. **Extract Content** - Claude vision for images
6. **Templates** - 6 built-in PRD templates
7. **Settings** - Customize tone, hierarchy, document type
8. **History** - Access all past chats
9. **Real-time** - Streaming responses
10. **Secure** - Row Level Security on all data

---

## 📝 Quick Reference

### **Supabase Dashboard**
https://supabase.com/dashboard/project/YOUR-PROJECT-ID

### **Key Files**
- `.env` - Environment variables
- `supabase/config.toml` - Project configuration
- `supabase/migrations/20241208000000_initial_schema.sql` - Database schema

### **Useful Commands**
```bash
# Check functions status
npx supabase functions list

# View function logs
npx supabase functions logs generate-prd

# Redeploy a function
npx supabase functions deploy generate-prd

# Link project (if not linked)
npx supabase link --project-ref YOUR-PROJECT-ID
```

---

## 🚀 Next Steps After Setup

Once everything works:

1. **Test thoroughly** - Try all features
2. **Customize** - Adjust templates, settings
3. **Deploy** - Host on Vercel/Netlify
4. **Add features** - Export integrations (Phase 2)

---

**Total Setup Time:** ~15-20 minutes

**Let's get started!** 🎉
