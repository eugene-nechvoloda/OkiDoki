# 🎯 OkiDoki Setup - For Complete Beginners

**Time needed:** 30 minutes
**No coding required!** Just follow these steps exactly.

---

## 📋 What You'll Need

1. A **Google account** (for signing into your app)
2. An **Anthropic account** (for Claude AI) - Get at https://console.anthropic.com
3. 30 minutes of uninterrupted time

---

## Part 1: Create Supabase Project (Database)

### Step 1.1: Sign up for Supabase

1. Open your web browser
2. Go to: **https://supabase.com**
3. Click the green **"Start your project"** button (top right)
4. Sign up with your GitHub account (or create one if you don't have it)
5. Confirm your email if asked

### Step 1.2: Create a New Project

1. You should see a page that says "Your projects"
2. Click the **"New Project"** button
3. Fill in these fields:
   - **Name:** Type `okidoki-prd-agent`
   - **Database Password:** Click "Generate a password" button
   - **Copy this password** and save it somewhere safe (Notepad, Notes app, etc.)
   - **Region:** Choose the one closest to you (like "US East" if you're in America)
   - **Pricing Plan:** Leave it on "Free"
4. Click the green **"Create new project"** button
5. ⏰ Wait 2-3 minutes - you'll see a loading screen

### Step 1.3: Get Your Project Information

Once the project is ready (green checkmark appears):

1. Look at your browser's address bar - you'll see something like:
   ```
   https://supabase.com/dashboard/project/XXXXXXXXXXXXX
   ```
   The X's are your **Project ID** - copy them!

2. On the left sidebar, click the **⚙️ Settings** icon (near the bottom)
3. Click **"API"** in the settings menu
4. You'll see a page with keys and URLs

**Copy these THREE things** (paste them into a Notepad file):

📝 **Thing 1 - Project URL:**
- Find "Project URL"
- Click the copy icon 📋
- Paste it in your Notepad - label it "PROJECT URL"
- It looks like: `https://abcdefg.supabase.co`

📝 **Thing 2 - Project Reference ID:**
- Find "Project ref" (same as the X's from step 1)
- Copy it
- Paste in Notepad - label it "PROJECT ID"
- It looks like: `abcdefg`

📝 **Thing 3 - Anon Key:**
- Find "anon public" key
- Click the copy icon 📋
- Paste in Notepad - label it "ANON KEY"
- It's very long and starts with: `eyJ...`

**✅ Checkpoint:** You should have 3 things in your Notepad:
- PROJECT URL
- PROJECT ID
- ANON KEY

---

## Part 2: Setup Your Database

### Step 2.1: Open the SQL Editor

1. In Supabase, on the left sidebar, click **"SQL Editor"** (looks like </> icon)
2. Click the **"New query"** button (top right)
3. You'll see a big empty text box

### Step 2.2: Copy the Database Setup Code

1. On your computer, go to your OkiDoki folder
2. Open this folder: `supabase` → `migrations`
3. Find the file: `20241208000000_initial_schema.sql`
4. **Right-click** the file → **Open with** → Choose **Notepad** (or TextEdit on Mac)
5. Press **Ctrl+A** (or Cmd+A on Mac) to select everything
6. Press **Ctrl+C** (or Cmd+C) to copy

### Step 2.3: Run the Database Setup

1. Go back to Supabase in your browser (the SQL Editor page)
2. Click in the big empty text box
3. Press **Ctrl+V** (or Cmd+V) to paste everything
4. Look at the bottom right corner
5. Click the **"RUN"** button (or press **Ctrl+Enter**)
6. ⏰ Wait 5-10 seconds
7. You should see: **"Success. No rows returned"** in green

**✅ Checkpoint:** Your database is now set up with 11 tables!

---

## Part 3: Get Google Login Working

### Step 3.1: Create Google OAuth Credentials

1. Open a new browser tab
2. Go to: **https://console.cloud.google.com**
3. Sign in with your Google account
4. You'll see "Select a project" at the top
5. Click **"NEW PROJECT"** (top right)
6. Name it: `OkiDoki App`
7. Click **"CREATE"**
8. Wait for it to be created (you'll see a notification)

### Step 3.2: Enable Google+ API

1. Click the **☰ menu** (top left, three lines)
2. Hover over **"APIs & Services"**
3. Click **"Library"**
4. In the search box, type: `Google+ API`
5. Click on **"Google+ API"** in the results
6. Click the blue **"ENABLE"** button
7. Wait a few seconds

### Step 3.3: Create OAuth Credentials

1. Click the **☰ menu** again (top left)
2. Go to **"APIs & Services"** → **"Credentials"**
3. Click **"+ CREATE CREDENTIALS"** (top middle)
4. Choose **"OAuth client ID"**

If it says "Configure consent screen":
- Click **"CONFIGURE CONSENT SCREEN"**
- Choose **"External"**
- Click **"CREATE"**
- **App name:** Type `OkiDoki`
- **User support email:** Choose your email
- **Developer contact:** Type your email
- Click **"SAVE AND CONTINUE"**
- Click **"SAVE AND CONTINUE"** again (skip Scopes)
- Click **"BACK TO DASHBOARD"**
- Now go back and click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

5. **Application type:** Choose **"Web application"**
6. **Name:** Type `OkiDoki Web Client`

7. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**

8. Add TWO URIs (remember your Project ID from Notepad?):

   **First URI - paste this** (replace YOUR-PROJECT-ID with your actual ID):
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```

   Example: If your ID is `abcdefg`, you'd type:
   ```
   https://abcdefg.supabase.co/auth/v1/callback
   ```

9. Click **"+ ADD URI"** again

   **Second URI - paste exactly this:**
   ```
   http://localhost:5173
   ```

10. Click the blue **"CREATE"** button

11. A popup appears with your credentials!

**Copy these TWO things** (add to your Notepad):

📝 **Thing 4 - Client ID:**
- Copy the **"Your Client ID"**
- Paste in Notepad - label it "GOOGLE CLIENT ID"
- Looks like: `123456789-abc.apps.googleusercontent.com`

📝 **Thing 5 - Client Secret:**
- Copy the **"Your Client Secret"**
- Paste in Notepad - label it "GOOGLE CLIENT SECRET"
- Looks like: `GOCSPX-abc123xyz`

12. Click **"OK"** to close the popup

### Step 3.4: Add Google Login to Supabase

1. Go back to your Supabase tab
2. On the left sidebar, click **🔐 Authentication**
3. Click **"Providers"**
4. Scroll down and find **"Google"**
5. Click on it to expand
6. Toggle **"Enabled"** to ON (should turn green)
7. Paste your credentials:
   - **Client ID:** Paste your GOOGLE CLIENT ID from Notepad
   - **Client Secret:** Paste your GOOGLE CLIENT SECRET from Notepad
8. Click **"Save"** at the bottom

**✅ Checkpoint:** Google login is configured!

---

## Part 4: Add Your AI Key

### Step 4.1: Get Anthropic API Key

1. Open a new tab: **https://console.anthropic.com**
2. Sign in or create account
3. Click **"Get API Keys"** or **"API Keys"** in menu
4. Click **"Create Key"**
5. Name it: `OkiDoki`
6. Click **"Create Key"**
7. **Copy the key** (starts with `sk-ant-...`)

📝 **Thing 6 - API Key:**
- Paste in Notepad - label it "ANTHROPIC KEY"

### Step 4.2: Add Key to Supabase

1. Go back to Supabase tab
2. Click **⚙️ Settings** (bottom left)
3. Click **"Edge Functions"** in the menu
4. Scroll down to **"Function secrets"** section
5. Click **"Add new secret"**
6. Fill in:
   - **Name:** Type exactly: `ANTHROPIC_API_KEY`
   - **Value:** Paste your ANTHROPIC KEY from Notepad
7. Click **"Create secret"**

**✅ Checkpoint:** AI is connected!

---

## Part 5: Update Your App Settings

### Step 5.1: Open Your Project Folder

1. On your computer, find your `OkiDoki` folder
2. Look for a file named `.env` (just `.env`, not `.env.txt`)
   - **On Windows:** You might need to show hidden files (View → Show → File name extensions)
   - **On Mac:** Press Cmd+Shift+. to show hidden files

### Step 5.2: Edit the .env File

1. **Right-click** the `.env` file
2. Choose **"Open with"** → **Notepad** (or TextEdit on Mac)
3. Delete everything in the file
4. Copy and paste this (I'll give you the exact text next):

```
VITE_SUPABASE_PROJECT_ID="YOUR-PROJECT-ID-HERE"
VITE_SUPABASE_URL="YOUR-PROJECT-URL-HERE"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR-ANON-KEY-HERE"
```

5. Now replace the text:
   - Replace `YOUR-PROJECT-ID-HERE` with your **PROJECT ID** from Notepad
   - Replace `YOUR-PROJECT-URL-HERE` with your **PROJECT URL** from Notepad
   - Replace `YOUR-ANON-KEY-HERE` with your **ANON KEY** from Notepad

**Example of what it should look like:**
```
VITE_SUPABASE_PROJECT_ID="abcdefg"
VITE_SUPABASE_URL="https://abcdefg.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
```

6. **Keep the quotes!** Don't remove the `"` marks
7. **Save the file:** Press Ctrl+S (or Cmd+S)
8. **Close Notepad**

### Step 5.3: Update Config File

1. In your OkiDoki folder, open: `supabase` folder → `config.toml` file
2. **Right-click** → **Open with** → **Notepad**
3. On **line 1**, you'll see: `project_id = "YOUR-PROJECT-ID-HERE"`
4. Replace `YOUR-PROJECT-ID-HERE` with your **PROJECT ID** from Notepad
5. Should look like: `project_id = "abcdefg"`
6. **Save:** Press Ctrl+S (or Cmd+S)
7. **Close Notepad**

**✅ Checkpoint:** Your app knows about your database!

---

## Part 6: Deploy Your Backend Functions

### Step 6.1: Open Terminal/Command Prompt

**On Windows:**
1. Press **Windows key**
2. Type: `cmd`
3. Press **Enter**
4. A black window appears (Command Prompt)

**On Mac:**
1. Press **Cmd+Space**
2. Type: `terminal`
3. Press **Enter**
4. A window with text appears

### Step 6.2: Go to Your Project Folder

In the terminal/command prompt window, type:

**On Windows:**
```
cd C:\Users\YourName\OkiDoki
```
(Replace `YourName` with your actual username)

**On Mac:**
```
cd /Users/YourName/OkiDoki
```
(Replace `YourName` with your actual username)

**Easier way - both Windows and Mac:**
1. Open your OkiDoki folder in File Explorer/Finder
2. Drag the folder into the terminal window
3. It will type the path for you!
4. Press **Enter**

### Step 6.3: Link to Supabase

Type this command (replace with your PROJECT ID):
```
npx supabase link --project-ref YOUR-PROJECT-ID
```

Example:
```
npx supabase link --project-ref abcdefg
```

Press **Enter**

It might ask:
- "Do you want to install supabase?" → Type `y` and press Enter
- "Enter your database password" → Paste the password you saved in Part 1, Step 1.2

⏰ Wait for it to say "Linked project successfully"

### Step 6.4: Deploy All Functions

Type this command:
```
npx supabase functions deploy
```

Press **Enter**

⏰ Wait 2-3 minutes. You'll see text scrolling. Don't close the window!

You should see 6 functions being deployed:
- generate-prd
- save-chat
- get-chats
- save-document
- get-documents
- process-file

Wait until it says "All functions deployed"

**✅ Checkpoint:** Your backend is live!

---

## Part 7: Start Your App!

### Step 7.1: Install Dependencies (One Time Only)

In the same terminal window, type:
```
npm install
```

Press **Enter**

⏰ Wait 1-2 minutes for lots of files to download

### Step 7.2: Start the App

Type:
```
npm run dev
```

Press **Enter**

You should see:
```
  VITE ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### Step 7.3: Open Your App

1. Hold **Ctrl** (or Cmd on Mac) and **click** the link: `http://localhost:5173/`
2. Or open your browser and type: `http://localhost:5173/`
3. Your app should open!

**✅ You should see a login page!**

---

## Part 8: Test Everything

### Test 1: Sign In

1. Click **"Continue with Google"** button
2. Choose your Google account
3. Click "Allow" if it asks for permissions
4. You should be redirected to the chat interface!
5. Look at bottom-left corner - you should see your name and photo!

### Test 2: Generate a PRD

1. In the chat box at the bottom, type:
   ```
   Create a PRD for a mobile app that helps people track their daily water intake
   ```
2. Press **Enter**
3. Watch the magic! ✨
4. You should see text appearing in real-time on the right side
5. It's Claude AI writing your PRD!

### Test 3: Check If It Saved

1. Click **Refresh** in your browser (F5 or Cmd+R)
2. Your chat should still be there!
3. This means the database is working!

---

## 🎉 You're Done!

### What You Can Do Now:

✅ **Generate PRDs** - Type any product idea
✅ **Upload images** - Click the paperclip icon
✅ **Try templates** - Click the dropdown for different PRD types
✅ **Change settings** - Adjust tone, hierarchy, document type
✅ **View history** - All your chats are saved

### Your App Has:

- ✅ Google login
- ✅ Claude Sonnet 4.5 AI
- ✅ Database that saves everything
- ✅ File upload and processing
- ✅ 6 PRD templates
- ✅ Real-time streaming responses

---

## 🆘 Having Problems?

### "npm is not recognized"

**On Windows:**
1. Download Node.js: https://nodejs.org
2. Install it (use all default settings)
3. **Close and reopen** Command Prompt
4. Try again

**On Mac:**
1. Download Node.js: https://nodejs.org
2. Install it
3. **Close and reopen** Terminal
4. Try again

### "Failed to fetch" error

- Make sure all 6 functions deployed successfully
- Check the terminal for any red error messages
- Try deploying again: `npx supabase functions deploy`

### Can't sign in with Google

- Make sure you copied Client ID and Client Secret correctly
- Check that redirect URIs are correct in Google Cloud Console
- Make sure Google provider is ENABLED in Supabase

### Nothing happens when I send a message

- Check you added ANTHROPIC_API_KEY in Supabase secrets
- Make sure the key starts with `sk-ant-`
- Check browser console (press F12) for errors

### Need more help?

1. Press F12 in your browser (Developer Tools)
2. Click "Console" tab
3. Take a screenshot of any red errors
4. Share them for help

---

## 🎯 Quick Reference

**To start your app again later:**

1. Open terminal/command prompt
2. Navigate to OkiDoki folder: `cd path/to/OkiDoki`
3. Run: `npm run dev`
4. Open: http://localhost:5173

**To stop your app:**

- In the terminal, press **Ctrl+C**

---

**Congratulations! You built a full-stack AI app!** 🚀

Even though you said you have 0 coding skills, you just:
- Set up a database
- Configured authentication
- Deployed cloud functions
- Connected AI
- Launched a web application

That's impressive! 🎉
