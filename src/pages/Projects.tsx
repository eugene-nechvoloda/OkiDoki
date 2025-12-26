import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderKanban,
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit,
  ArrowLeft,
  Save,
  X,
  FolderOpen,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getDocuments,
  saveDocument,
  generatePRD,
} from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import type { Project, PRDDocument } from "@/types/database";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { TextImprovementToolbar } from "@/components/prd/TextImprovementToolbar";
import { TextImprovementConfirmPanel } from "@/components/prd/TextImprovementConfirmPanel";

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chats, currentChat, createNewChat, selectChat } = useChat();

  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<PRDDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PRDDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Inline selection editing state (view mode)
  const docContentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [originalSelectedText, setOriginalSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectionRects, setSelectionRects] = useState<DOMRect[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedText, setRegeneratedText] = useState<string | null>(null);
  const toolbarDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Project creation/edit state
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [user]);

  // Load documents when project is selected
  useEffect(() => {
    if (selectedProject) {
      loadProjectDocuments(selectedProject.id);
    }
  }, [selectedProject]);

  async function loadProjects() {
    try {
      setLoading(true);
      const { projects: proj } = await getProjects({ limit: 100 });
      setProjects(proj);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectDocuments(projectId: string) {
    try {
      const { documents: docs } = await getDocuments({ projectId, limit: 100 });
      setProjectDocuments(docs);
    } catch (error) {
      console.error("Failed to load project documents:", error);
      toast.error("Failed to load documents");
    }
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      if (editingProject) {
        await updateProject({
          projectId: editingProject.id,
          name: projectName,
          description: projectDescription,
        });
        toast.success("Project updated successfully");
      } else {
        await createProject({
          name: projectName,
          description: projectDescription,
        });
        toast.success("Project created successfully");
      }

      setShowProjectDialog(false);
      setProjectName("");
      setProjectDescription("");
      setEditingProject(null);
      await loadProjects();
    } catch (error) {
      console.error("Failed to create/update project:", error);
      toast.error("Failed to save project");
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setShowProjectDialog(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete);
      toast.success("Project deleted successfully");
      await loadProjects();
      if (selectedProject?.id === projectToDelete) {
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    } finally {
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedDoc(null);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setProjectDocuments([]);
    setSelectedDoc(null);
  };

  const handleOpenDocument = (doc: PRDDocument) => {
    setSelectedDoc(doc);
    setEditContent(doc.content_markdown || "");
    setIsEditing(false);
    setSelectedText("");
    setOriginalSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setSelectionRects([]);
    setIsRegenerating(false);
    setRegeneratedText(null);
  };

  const handleSaveDocument = async () => {
    if (!selectedDoc) return;

    try {
      const { document } = await saveDocument({
        documentId: selectedDoc.id,
        title: selectedDoc.title,
        contentMarkdown: editContent,
        status: selectedDoc.status as "draft" | "final" | "archived",
      });

      toast.success("Document saved successfully");
      setIsEditing(false);
      setSelectedDoc(document);

      if (selectedProject) {
        await loadProjectDocuments(selectedProject.id);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      toast.error("Failed to save document");
    }
  };

  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground border-b pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="mb-4 text-foreground/90 leading-relaxed">
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-foreground">{children}</em>,
    code: ({ children, className }) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {children}
        </code>
      ) : (
        <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4 text-foreground">
          {children}
        </code>
      );
    },
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();

    if (selected && selected.length > 3 && docContentRef.current) {
      try {
        const range = selection?.getRangeAt(0);
        if (range && docContentRef.current.contains(range.commonAncestorContainer)) {
          setSelectedText(selected);
          const rect = range.getBoundingClientRect();
          setSelectionPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8,
          });

          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(docContentRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          const start = preSelectionRange.toString().length;
          const end = start + selected.length;
          setSelectionRange({ start, end });
        }
      } catch (e) {
        // Selection might be invalid
      }
    }
  };

  // Clear selection state (but don't clear browser selection to keep highlight)
  const clearSelectionState = () => {
    if (regeneratedText) return;
    setSelectedText("");
    setOriginalSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setSelectionRects([]);
  };

  // Delayed toolbar show function
  const showToolbarDelayed = useCallback((position: { x: number; y: number }, text: string, rects: DOMRect[]) => {
    if (toolbarDelayRef.current) {
      clearTimeout(toolbarDelayRef.current);
    }
    toolbarDelayRef.current = setTimeout(() => {
      setSelectedText(text);
      setOriginalSelectedText(text);
      setSelectionPosition(position);
      setSelectionRects(rects);
    }, 500);
  }, []);

  // Use effect to add global pointer listeners for better selection detection
  useEffect(() => {
    const checkSelection = () => {
      const selection = window.getSelection();
      const selected = selection?.toString().trim();

      if (selected && selected.length > 3 && docContentRef.current) {
        try {
          const range = selection?.getRangeAt(0);
          if (range && docContentRef.current.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            const position = {
              x: rect.left + rect.width / 2,
              y: rect.bottom + 8,
            };

            // Capture all rects for multi-line selections
            const rects = Array.from(range.getClientRects());

            showToolbarDelayed(position, selected, rects);
          }
        } catch (e) {
          // Selection might be invalid
        }
      }
    };

    const handleGlobalPointerUp = () => {
      setTimeout(checkSelection, 20);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key.startsWith("Arrow")) {
        setTimeout(checkSelection, 20);
      }
    };

    document.addEventListener("pointerup", handleGlobalPointerUp, true);
    document.addEventListener("keyup", handleKeyUp, true);
    return () => {
      document.removeEventListener("pointerup", handleGlobalPointerUp, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      if (toolbarDelayRef.current) {
        clearTimeout(toolbarDelayRef.current);
      }
    };
  }, [regeneratedText, selectedDoc, showToolbarDelayed]);

  // Clear selection when the user clicks outside the document content/toolbar
  const handlePointerDownOutside = (e: React.PointerEvent) => {
    if (regeneratedText) return;

    const target = e.target as HTMLElement;

    if (target.closest("[data-toolbar]")) return;
    if (docContentRef.current?.contains(target)) return;

    clearSelectionState();
    window.getSelection()?.removeAllRanges();
  };

  const handleImproveSelection = async (prompt: string) => {
    if (!selectedText) return;

    setIsRegenerating(true);
    setRegeneratedText(null);

    try {
      let fullResponse = "";
      await generatePRD(
        {
          messages: [
            {
              role: "user",
              content:
                prompt +
                "\n\nProvide ONLY the improved text, without any additional explanation.",
            },
          ],
          settings: { tone: "balanced", docType: "single", hierarchy: "1-level" },
        },
        (chunk) => {
          fullResponse += chunk;
        }
      );

      setRegeneratedText(fullResponse.trim());
    } catch (error) {
      console.error("Failed to improve text:", error);
      toast.error("Failed to improve text");
      setRegeneratedText(null);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAcceptImproved = () => {
    if (!originalSelectedText || !regeneratedText) return;

    // Find the selected text in the markdown and replace it
    // Use simple string replacement - find first occurrence of the original text
    const index = editContent.indexOf(originalSelectedText);
    if (index !== -1) {
      const newContent =
        editContent.slice(0, index) +
        regeneratedText +
        editContent.slice(index + originalSelectedText.length);
      setEditContent(newContent);
    } else {
      // Fallback: try case-insensitive or partial match
      toast.error("Could not find the selected text in the document");
    }

    setSelectedText("");
    setOriginalSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setSelectionRects([]);
    setRegeneratedText(null);
    toast.success("Changes applied");
    window.getSelection()?.removeAllRanges();
  };

  const handleRejectImproved = () => {
    setRegeneratedText(null);
    setSelectedText("");
    setOriginalSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setSelectionRects([]);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <MainLayout
      chats={chats}
      currentChatId={currentChat?.id}
      onNewChat={createNewChat}
      onSelectChat={selectChat}
    >
      <div className="h-full flex flex-col min-h-0">
        {selectedDoc ? (
          // Document Editor View
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDoc(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">{selectedDoc.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(selectedDoc.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(selectedDoc.content_markdown || "");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDocument}
                      className="gradient-brand text-primary-foreground"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDocument}
                      disabled={editContent === (selectedDoc.content_markdown || "")}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gradient-brand text-primary-foreground"
                    >
                      Edit Document
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto relative" onPointerDownCapture={handlePointerDownOutside}>
              {/* Persistent highlight overlay - orange for selection, green for improved text preview */}
              {selectionRects.length > 0 && selectedText && !regeneratedText && (
                <div className="pointer-events-none fixed inset-0 z-[9990]">
                  {selectionRects.map((rect, index) => (
                    <div
                      key={index}
                      className="absolute rounded-sm"
                      style={{
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                        backgroundColor: 'rgba(251, 191, 147, 0.5)', // Orange/peach highlight
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Green highlight for improved text preview */}
              {selectionRects.length > 0 && regeneratedText && (
                <div className="pointer-events-none fixed inset-0 z-[9990]">
                  {selectionRects.map((rect, index) => (
                    <div
                      key={index}
                      className="absolute rounded-sm"
                      style={{
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                        backgroundColor: 'rgba(134, 239, 172, 0.4)', // Light green highlight
                      }}
                    />
                  ))}
                </div>
              )}

              <TextImprovementToolbar
                selectedText={selectedText}
                position={selectionPosition}
                onImprove={handleImproveSelection}
                isProcessing={isRegenerating}
                improvedText={regeneratedText}
                onAccept={handleAcceptImproved}
                onReject={handleRejectImproved}
              />

              {regeneratedText && selectionPosition && (
                <TextImprovementConfirmPanel
                  position={selectionPosition}
                  selectionTop={selectionPosition.y - 8}
                  originalText={selectedText}
                  improvedText={regeneratedText}
                  onConfirm={handleAcceptImproved}
                  onDecline={handleRejectImproved}
                />
              )}

              <div className="max-w-4xl mx-auto px-6 py-8">
                {isEditing ? (
                  <div className="min-h-[600px]">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[600px] p-4 bg-background text-foreground border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm leading-relaxed"
                      placeholder="Write your PRD content here... (Markdown supported)"
                    />
                  </div>
                ) : (
                  <article
                    ref={docContentRef}
                    className={cn(
                      "prose prose-neutral dark:prose-invert max-w-none pb-20 select-text cursor-text text-selectable",
                      selectedText && "has-active-selection"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {editContent || "*No content*"}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
            </div>
          </div>
        ) : selectedProject ? (
          // Project Documents View
          <>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToProjects}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                      <FolderOpen className="h-6 w-6 text-primary" />
                      {selectedProject.name}
                    </h1>
                    {selectedProject.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedProject.description}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/")}
                  className="gradient-brand text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New PRD
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {projectDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No documents in this project</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      Create PRDs and save them to this project
                    </p>
                    <Button
                      onClick={() => navigate("/")}
                      className="gradient-brand text-primary-foreground"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New PRD
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="group p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => handleOpenDocument(doc)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                doc.status === "draft" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                doc.status === "final" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                doc.status === "archived" && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                              )}
                            >
                              {doc.status}
                            </div>
                          </div>
                        </div>

                        <h3 className="font-medium mb-2 line-clamp-2">{doc.title}</h3>

                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {doc.content_markdown
                            ? doc.content_markdown.slice(0, 150) + "..."
                            : "No content"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          // Projects List View
          <>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">Projects</h1>
                  <p className="text-sm text-muted-foreground">
                    Organize your PRDs into projects
                  </p>
                </div>
                <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                  <DialogTrigger asChild>
                    <Button
                      className="gradient-brand text-primary-foreground"
                      onClick={() => {
                        setEditingProject(null);
                        setProjectName("");
                        setProjectDescription("");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingProject ? "Edit Project" : "Create New Project"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingProject
                          ? "Update your project details"
                          : "Create a new project to organize your PRDs"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="project-name">Project Name</Label>
                        <Input
                          id="project-name"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="My Product Project"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="project-description">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="project-description"
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          placeholder="Describe your project..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowProjectDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateProject}
                          className="gradient-brand text-primary-foreground"
                        >
                          {editingProject ? "Update Project" : "Create Project"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Loading projects...</p>
                    </div>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                      <FolderKanban className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No projects yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      {searchQuery
                        ? "No projects match your search"
                        : "Create your first project to organize your PRDs"}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => setShowProjectDialog(true)}
                        className="gradient-brand text-primary-foreground"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="group p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer"
                        onClick={() => handleOpenProject(project)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FolderKanban className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="font-semibold text-lg mb-2">{project.name}</h3>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {project.description || "No description"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>0 docs</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? All documents will remain but be unassigned. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
