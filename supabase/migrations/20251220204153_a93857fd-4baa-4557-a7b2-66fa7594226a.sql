-- Create triggers for updated_at (use IF NOT EXISTS pattern)
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
DROP TRIGGER IF EXISTS update_prd_documents_updated_at ON public.prd_documents;
DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prd_documents_updated_at BEFORE UPDATE ON public.prd_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert built-in templates (only if they don't exist)
INSERT INTO public.templates (name, description, sections, is_custom, user_id) 
SELECT 'Standard PRD', 'Comprehensive product requirements document', ARRAY['Executive Summary', 'Problem Statement', 'Goals & Objectives', 'User Stories', 'Requirements', 'Technical Specifications', 'Timeline', 'Success Metrics'], false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Standard PRD' AND is_custom = false);

INSERT INTO public.templates (name, description, sections, is_custom, user_id) 
SELECT 'Discovery Brief', 'Quick discovery document for new ideas', ARRAY['Overview', 'Problem', 'Proposed Solution', 'Key Questions', 'Next Steps'], false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Discovery Brief' AND is_custom = false);

INSERT INTO public.templates (name, description, sections, is_custom, user_id) 
SELECT 'Experiment PRD', 'For A/B tests and experiments', ARRAY['Hypothesis', 'Experiment Design', 'Success Criteria', 'Risks', 'Timeline'], false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Experiment PRD' AND is_custom = false);

INSERT INTO public.templates (name, description, sections, is_custom, user_id) 
SELECT 'RFC', 'Request for Comments technical proposal', ARRAY['Summary', 'Motivation', 'Detailed Design', 'Alternatives Considered', 'Implementation Plan'], false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'RFC' AND is_custom = false);

INSERT INTO public.templates (name, description, sections, is_custom, user_id) 
SELECT 'API Documentation', 'API specification document', ARRAY['Overview', 'Authentication', 'Endpoints', 'Request/Response Examples', 'Error Handling'], false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'API Documentation' AND is_custom = false);

INSERT INTO public.templates (name, description, sections, is_custom, user_id) 
SELECT 'Competitive Analysis', 'Competitor analysis document', ARRAY['Executive Summary', 'Competitor Overview', 'Feature Comparison', 'Strengths & Weaknesses', 'Recommendations'], false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Competitive Analysis' AND is_custom = false);