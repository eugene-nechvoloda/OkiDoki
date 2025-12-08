#!/bin/bash

# OkiDoki PRD Agent - Setup Script
# Run this after creating your Supabase project

set -e

echo "🚀 OkiDoki PRD Agent - Supabase Setup"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Prompt for Supabase credentials
echo "📝 Please enter your Supabase project details:"
echo ""
read -p "Project ID (e.g., abcdefghijklmnop): " PROJECT_ID
read -p "Project URL (e.g., https://abcdefghijklmnop.supabase.co): " PROJECT_URL
read -p "Anon/Public Key: " ANON_KEY

# Update .env file
echo ""
echo "📝 Updating .env file..."
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="$PROJECT_ID"
VITE_SUPABASE_URL="$PROJECT_URL"
VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
EOF

# Update config.toml
echo "📝 Updating supabase/config.toml..."
sed -i "s/project_id = \"YOUR-PROJECT-ID-HERE\"/project_id = \"$PROJECT_ID\"/" supabase/config.toml

echo ""
echo "✅ Configuration files updated!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Apply database migration:"
echo "   → Go to $PROJECT_URL/project/default/sql/new"
echo "   → Copy contents of supabase/migrations/20241208000000_initial_schema.sql"
echo "   → Paste and run"
echo ""
echo "2. Configure Google OAuth:"
echo "   → Go to $PROJECT_URL/project/default/auth/providers"
echo "   → Enable Google provider"
echo "   → Add Google OAuth credentials"
echo ""
echo "3. Set Anthropic API key:"
echo "   → Go to $PROJECT_URL/project/default/settings/functions"
echo "   → Add secret: ANTHROPIC_API_KEY = <your-key>"
echo ""
echo "4. Deploy edge functions:"
echo "   npx supabase functions deploy generate-prd"
echo "   npx supabase functions deploy save-chat"
echo "   npx supabase functions deploy get-chats"
echo "   npx supabase functions deploy save-document"
echo "   npx supabase functions deploy get-documents"
echo "   npx supabase functions deploy process-file"
echo ""
echo "5. Run the app:"
echo "   npm run dev"
echo ""
echo "🎉 Setup complete! Follow the steps above to finish configuration."
