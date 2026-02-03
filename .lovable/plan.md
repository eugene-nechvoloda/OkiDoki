
# Add Export Actions to Document View Header

## Overview
Add the same set of actions (Export, Copy Markdown, Download PDF) from the PRD Preview header to the Documents -> Folder -> Document view. This will allow users to export, copy, and download documents directly from the Documents page without needing to regenerate them.

## Current State
- The **PRD Preview** header has: Save, Export (to integrations), Revert, Collapse, and a three-dot menu with Copy Markdown, Download PDF/Markdown, and Generate Backlog
- The **Documents page** document view only has: Back button, Save Changes, and Edit Document buttons

## Implementation Plan

### Step 1: Add Required Imports to Projects.tsx
Add the necessary imports for the new functionality:
- Icons: `Copy`, `Check`, `Share2`, `FileDown`, `MoreVertical`, `Loader2`, `ListTodo`
- Export function: `INTEGRATION_CONFIG` from api.ts
- PDF export: `exportToPDF` from utils
- Supabase client for loading integrations
- Type for Integration

### Step 2: Add State Variables for Export Functionality
Add state to track:
- `copied` - for copy markdown feedback
- `isExporting` / `exportingProvider` - for export loading states
- `connectedIntegrations` - list of connected integrations

### Step 3: Add Integration Loading Effect
Add a `useEffect` that loads connected integrations from:
- Supabase database (for authenticated users)
- localStorage under `okidoki_integrations` key (for guest users)

This logic already exists in PRDPreview.tsx and will be reused.

### Step 4: Add Action Handler Functions
Implement the following functions (copying logic from PRDPreview.tsx):
- `handleCopyMarkdown()` - Copy document markdown to clipboard
- `handleDownloadMarkdown()` - Download as .md file
- `handleDownloadPDF()` - Generate and download PDF using existing `exportToPDF`
- `handleExportToIntegration(provider)` - Export to Linear/Confluence/Gamma/Napkin
- `isIntegrationConnected(provider)` - Check if an integration is connected

### Step 5: Update Document Header UI
Replace the current simple header with a more feature-rich version that includes:
- **Primary actions (always visible)**:
  - Save Changes button (existing)
  - Export dropdown (Share2 icon) - lists connected integrations
- **Three-dot menu (secondary actions)**:
  - Copy markdown
  - Download PDF
  - Download Markdown

### UI Layout
```text
+------------------------------------------------------------------+
|  [<-]  Document Title                                             |
|        Last updated: date          [Export v] [Save] [Edit] [...] |
+------------------------------------------------------------------+
```

The three-dot menu will contain:
- Copy markdown (with checkmark feedback)
- Download submenu:
  - PDF
  - Markdown

## Technical Details

### Code Changes

**File: `src/pages/Projects.tsx`**

1. **Add imports** (around line 1-50):
```typescript
import {
  // existing imports...
  Copy,
  Check,
  Share2,
  FileDown,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { INTEGRATION_CONFIG } from "@/services/api";
import { exportToPDF } from "@/utils/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import type { Integration } from "@/types/database";
```

2. **Add state variables** (around line 80-90):
```typescript
// Export state
const [copied, setCopied] = useState(false);
const [isExporting, setIsExporting] = useState(false);
const [exportingProvider, setExportingProvider] = useState<string | null>(null);
const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
```

3. **Add integration loading effect** (after other useEffects):
```typescript
useEffect(() => {
  const loadIntegrations = async () => {
    // Load from Supabase for authenticated users
    // Load from localStorage for guest users
    // (same logic as PRDPreview.tsx lines 256-287)
  };
  loadIntegrations();
}, []);
```

4. **Add handler functions** (after existing handlers):
```typescript
const handleCopyMarkdown = async () => {
  // Copy editContent to clipboard
};

const handleDownloadMarkdown = () => {
  // Download as .md file
};

const handleDownloadPDF = async () => {
  // Use exportToPDF utility
};

const handleExportToIntegration = async (provider: string) => {
  // Call the appropriate edge function
};

const isIntegrationConnected = (provider: string) => {
  // Check connectedIntegrations array
};
```

5. **Update document header UI** (lines 494-554):
Replace the existing header with:
- Keep the back button and title
- Add Export dropdown with connected integrations
- Move Save/Edit buttons
- Add three-dot menu with Copy and Download options

### Dependencies
All dependencies are already installed:
- jsPDF (for PDF export)
- @supabase/supabase-js (for database access)
- lucide-react (for icons)

### Existing Functions to Reuse
| Function | Location | Purpose |
|----------|----------|---------|
| `exportToPDF` | `src/utils/pdfExport.ts` | Generate PDF from markdown |
| `INTEGRATION_CONFIG` | `src/services/api.ts` | Integration metadata |
| Edge function `export-to-linear-mcp` | Backend | Linear export |
| Edge function `export-to-integration` | Backend | Generic export |

## Benefits
- Users can export documents without regenerating them
- Consistent experience across PRD Preview and Document view
- No new backend changes required - uses existing edge functions
- Supports both guest and authenticated users
