-- Insert 6 built-in templates (hardcoded templates)
-- Run this in Supabase SQL Editor: https://mlirwabkxjvleutcehae.supabase.co/project/default/sql/new

-- Delete existing built-in templates first (in case some were partially inserted)
DELETE FROM public.templates WHERE is_custom = false;

-- Insert the 6 built-in templates
INSERT INTO public.templates (name, description, sections_json, is_custom, visibility, owner_id) VALUES
(
    'Standard PRD',
    'Comprehensive product requirements document template',
    '["Executive Summary", "Problem Statement", "Goals & Non-Goals", "Users & Personas", "Use Cases", "Requirements", "Acceptance Criteria", "UX Flows", "Success Metrics", "Risks & Assumptions", "Open Questions"]'::jsonb,
    false,
    'public',
    NULL
),
(
    'Discovery Brief',
    'Research and exploration documentation template',
    '["Context", "Research Questions", "Hypotheses", "Research Plan", "Key Signals to Validate", "Findings", "Recommendations", "Next Steps"]'::jsonb,
    false,
    'public',
    NULL
),
(
    'Experiment PRD',
    'A/B test and experiment documentation template',
    '["Hypothesis", "Experiment Design", "Success Metrics", "Sample Size & Power Analysis", "Procedure", "Risks & Mitigation", "Post-Analysis Plan"]'::jsonb,
    false,
    'public',
    NULL
),
(
    'RFC (Request for Comments)',
    'Lightweight technical proposal template',
    '["Proposal", "Rationale", "Alternatives Considered", "Impact Analysis", "Rollout Plan", "Decision & Sign-off"]'::jsonb,
    false,
    'public',
    NULL
),
(
    'API Documentation',
    'Technical API specification template',
    '["Overview", "Authentication", "Endpoints", "Request/Response Formats", "Error Codes", "Rate Limiting", "Examples", "Changelog"]'::jsonb,
    false,
    'public',
    NULL
),
(
    'Competitive Analysis',
    'Market and competitor research template',
    '["Market Overview", "Competitors", "Feature Comparison", "Pricing Analysis", "Strengths & Weaknesses", "Opportunities & Threats", "Strategic Recommendations"]'::jsonb,
    false,
    'public',
    NULL
);

-- Verify templates were inserted
SELECT id, name, is_custom, visibility FROM public.templates ORDER BY is_custom, name;
