-- Rename projects table to folders
ALTER TABLE public.projects RENAME TO folders;

-- Update RLS policy names to reflect the new table name
ALTER POLICY "Users can create their own projects" ON public.folders RENAME TO "Users can create their own folders";
ALTER POLICY "Users can delete their own projects" ON public.folders RENAME TO "Users can delete their own folders";
ALTER POLICY "Users can update their own projects" ON public.folders RENAME TO "Users can update their own folders";
ALTER POLICY "Users can view their own projects" ON public.folders RENAME TO "Users can view their own folders";

-- Update the prd_documents table to rename project_id column to folder_id
ALTER TABLE public.prd_documents RENAME COLUMN project_id TO folder_id;