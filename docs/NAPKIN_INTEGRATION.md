# Napkin AI Integration

## Overview

The Napkin AI integration enables automatic visual diagram generation from your Product Requirements Documents (PRDs). Napkin AI uses advanced AI to analyze your PRD content and create professional diagrams including flowcharts, entity-relationship diagrams (ERDs), workflows, mind maps, and more.

## Features

- **Automatic Diagram Type Selection**: Napkin AI analyzes your PRD content and intelligently selects the most appropriate diagram type
- **Multiple Diagram Types Supported**:
  - Flowcharts (decision flows, conditional logic)
  - Workflow Diagrams (process steps, sequential flows)
  - Data Flow Diagrams (system integrations, data pipelines)
  - Entity-Relationship Diagrams (database schemas, data models)
  - Mind Maps (concept hierarchies, brainstorming)
  - Business Frameworks (strategic planning, business models)
  - Process Maps (detailed operational procedures)
  - Infographics (key metrics, visual summaries)

- **Professional Styling**: Diagrams are generated with professional, clean visual styles
- **One-Click Attachment**: Generated diagrams can be directly embedded into your PRD
- **Export to Multiple Formats**: PNG, SVG, PDF, and PPTX formats supported

## Setup Instructions

### Step 1: Get Your Napkin AI API Key

1. Go to [Napkin AI](https://napkin.ai)
2. Sign up or log in to your account
3. Navigate to **Settings** → **API** or **Developer Settings**
4. Generate a new API key
5. Copy the API key (it usually starts with `napkin_` or similar)

### Step 2: Connect Napkin AI in OkiDoki

1. In OkiDoki, go to **Integrations** page
2. Find the **Napkin AI** integration card
3. Click **Connect**
4. Choose one of the connection methods:
   - **OAuth (Recommended)**: Click "Connect with OAuth" for secure authentication
   - **API Key**: Paste your API key from Step 1

5. Click **Connect** to save

### Step 3: Verify Connection

Once connected, you'll see:
- A green "Connected" badge on the Napkin AI integration card
- A new **diagram generation button** (wand icon) in the PRD Preview panel header

## How to Use

### Method 1: Generate Diagram from PRD Preview

1. Generate or open a PRD in the preview panel
2. Click the **wand icon** (✨) in the PRD Preview header
3. Napkin AI will:
   - Analyze your PRD content
   - Determine the best diagram type
   - Generate a professional diagram
4. Review the generated diagram in the popup
5. Click **Attach to PRD** to embed it in your document

### Method 2: Export to Napkin AI

1. In the PRD Preview panel, click the **Share** (export) dropdown
2. Select **Napkin AI**
3. The diagram will be generated and opened in a new tab

## How Diagram Type Selection Works

Napkin AI automatically analyzes your PRD content to select the best diagram type:

- **ERD (Entity-Relationship Diagram)**: Selected when PRD mentions database, schema, entities, tables, or relationships
- **Workflow Diagram**: Selected when PRD describes processes, steps, approvals, or pipelines
- **Data Flow Diagram**: Selected when PRD involves data pipelines, transformations, APIs, or integrations
- **Flowchart**: Selected when PRD contains decision points, conditions, or branches
- **Mind Map**: Selected when PRD focuses on concepts, ideas, brainstorming, or hierarchies
- **Business Framework**: Selected when PRD discusses strategy, frameworks, or business models

You can also manually specify the diagram type if needed.

## Best Practices

### 1. Clear Section Headers
Use clear markdown headers in your PRD to help Napkin AI understand the document structure:

```markdown
# Project Overview
## Key Features
## User Flows
## Data Model
```

### 2. Include Relevant Keywords
Use domain-specific keywords that help identify the appropriate diagram type:
- For ERDs: "database", "entity", "table", "relationship"
- For workflows: "step", "process", "approval", "workflow"
- For data flows: "API", "integration", "data flow", "pipeline"

### 3. Provide Context
Add a context or goal section at the beginning of your PRD to give Napkin AI better understanding:

```markdown
## Context
This PRD describes a user authentication system with OAuth integration
and role-based access control.
```

### 4. Review and Iterate
- Always review the generated diagram before attaching it to your PRD
- If the diagram doesn't match expectations, try adjusting your PRD content to be more explicit about the type of visualization needed

## Troubleshooting

### "Napkin AI API key not configured" Error

**Solution**: Ensure you've properly connected your Napkin AI integration in the Integrations page and that your API key is valid.

### Diagram Generation Fails

**Possible causes**:
1. **Invalid API Key**: Verify your API key is correct and has not expired
2. **API Rate Limit**: You may have exceeded Napkin AI's rate limits. Wait a few minutes and try again
3. **Content Too Large**: Very large PRDs may fail. Try generating a diagram for a specific section instead

### Diagram Type Doesn't Match Content

**Solution**: The automatic selection is based on keyword analysis. To get a specific diagram type, use explicit keywords:
- Add phrases like "The following workflow shows..." for workflow diagrams
- Use "The database schema includes..." for ERDs
- Reference "The data flow diagram below..." for data flow diagrams

### Generated Diagram is Not Clear

**Solution**:
1. Make your PRD more structured with clear sections
2. Simplify complex descriptions into bullet points
3. Focus on key relationships and flows rather than detailed explanations

## API Reference

For developers who want to integrate Napkin AI programmatically:

```typescript
import { generateDiagram } from "@/services/napkinAi";

const result = await generateDiagram({
  text: prdContent,
  title: "My PRD Diagram",
  diagramType: "workflow", // or "auto" for automatic selection
  style: "professional",
  context: "Additional context for better generation",
  goal: "Create a clear workflow diagram"
});

if (result.success) {
  console.log("Diagram URL:", result.imageUrl);
}
```

## Pricing

Napkin AI integration is subject to Napkin AI's pricing terms. Check [Napkin AI Pricing](https://napkin.ai/pricing) for current rates.

## Support

- **OkiDoki Issues**: Report integration issues on the [OkiDoki GitHub repository](https://github.com/yourusername/okidoki)
- **Napkin AI Issues**: Contact Napkin AI support at support@napkin.ai

## Privacy & Security

- API keys are securely stored in your Supabase database (or browser localStorage for guest mode)
- API keys are encrypted in transit
- Your PRD content is sent to Napkin AI for diagram generation (subject to Napkin AI's privacy policy)
- Generated diagrams are stored according to Napkin AI's terms of service
