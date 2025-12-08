import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutTemplate,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  ArrowRight,
  Edit,
  Trash2,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import type { Template } from "@/types/database";
import { toast } from "sonner";

export default function Templates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chats, currentChat, createNewChat, selectChat, setSelectedTemplate } = useChat();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Template creation/edit state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSections, setTemplateSections] = useState<string[]>([""]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [user]);

  async function loadTemplates() {
    if (!user) return;

    try {
      setLoading(true);
      const { templates: tmpl } = await getTemplates({ limit: 100 });
      setTemplates(tmpl);
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  // Filter templates by search query
  const filteredTemplates = templates.filter(
    (tmpl) =>
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tmpl.description && tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Separate built-in and custom templates
  const builtInTemplates = filteredTemplates.filter((t) => !t.is_custom);
  const customTemplates = filteredTemplates.filter((t) => t.is_custom);

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    const cleanSections = templateSections.filter((s) => s.trim().length > 0);
    if (cleanSections.length === 0) {
      toast.error("At least one section is required");
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate({
          templateId: editingTemplate.id,
          name: templateName,
          description: templateDescription,
          sections: cleanSections,
        });
        toast.success("Template updated successfully");
      } else {
        await createTemplate({
          name: templateName,
          description: templateDescription,
          sections: cleanSections,
        });
        toast.success("Template created successfully");
      }

      setShowTemplateDialog(false);
      resetTemplateForm();
      await loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    const sections = Array.isArray(template.sections_json)
      ? template.sections_json
      : [];
    setTemplateSections(sections.length > 0 ? sections as string[] : [""]);
    setShowTemplateDialog(true);
  };

  const handleDeleteTemplate = async (templateId: string, isCustom: boolean) => {
    if (!isCustom) {
      toast.error("Cannot delete built-in templates");
      return;
    }

    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate(templateId);
      toast.success("Template deleted successfully");
      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template");
    }
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setTemplateSections([""]);
  };

  const addSection = () => {
    setTemplateSections([...templateSections, ""]);
  };

  const removeSection = (index: number) => {
    if (templateSections.length > 1) {
      setTemplateSections(templateSections.filter((_, i) => i !== index));
    }
  };

  const updateSection = (index: number, value: string) => {
    const newSections = [...templateSections];
    newSections[index] = value;
    setTemplateSections(newSections);
  };

  // Handle using a template
  const handleUseTemplate = (template: Template) => {
    const sections = Array.isArray(template.sections_json)
      ? template.sections_json
      : [];

    setSelectedTemplate({
      id: template.id,
      name: template.name,
      sections: sections as string[],
    });

    toast.success(`Using template: ${template.name}`);

    // Navigate back to chat to start creating PRD with this template
    setTimeout(() => {
      navigate("/");
    }, 500);
  };

  // Handle viewing template details
  const handleViewDetails = (template: Template) => {
    setSelectedTemplateId(selectedTemplateId === template.id ? null : template.id);
  };

  const TemplateCard = ({ template }: { template: Template }) => {
    const sections = Array.isArray(template.sections_json)
      ? template.sections_json
      : [];
    const isExpanded = selectedTemplateId === template.id;

    return (
      <div
        className={cn(
          "group p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-all",
          isExpanded && "ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{template.name}</h3>
              {!template.is_custom && (
                <span className="text-xs text-primary font-medium">Built-in</span>
              )}
              {template.is_custom && (
                <span className="text-xs text-green-600 font-medium">Custom</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleUseTemplate(template)}
              className="gradient-brand text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Use
            </Button>
            {template.is_custom && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteTemplate(template.id, template.is_custom)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {template.description || "No description available"}
        </p>

        <div className="space-y-2">
          <button
            onClick={() => handleViewDetails(template)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {isExpanded ? "Hide" : "Show"} sections ({(sections as string[]).length})
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Template Sections:
              </p>
              <ul className="space-y-1.5">
                {(sections as string[]).map((section, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{section}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChat?.id}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onNavigate={(view) => {
          if (view === "chats") navigate("/");
          if (view === "projects") navigate("/projects");
          if (view === "templates") navigate("/templates");
          if (view === "integrations") navigate("/integrations");
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">PRD Templates</h1>
              <p className="text-sm text-muted-foreground">
                Choose a template to structure your product requirements
              </p>
            </div>
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button
                  className="gradient-brand text-primary-foreground"
                  onClick={resetTemplateForm}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Edit Template" : "Create Custom Template"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTemplate
                      ? "Update your template details"
                      : "Create a custom template with your own sections"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="My Custom PRD Template"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-description">Description (Optional)</Label>
                    <Textarea
                      id="template-description"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Describe what this template is for..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Template Sections</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Define the sections that should be included in PRDs using this template
                    </p>
                    <div className="space-y-2">
                      {templateSections.map((section, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={section}
                            onChange={(e) => updateSection(index, e.target.value)}
                            placeholder={`Section ${index + 1} (e.g., Executive Summary)`}
                          />
                          {templateSections.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSection(index)}
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSection}
                        type="button"
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowTemplateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTemplate}
                      className="gradient-brand text-primary-foreground"
                    >
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates List */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Loading templates...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Built-in Templates */}
                {builtInTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Built-in Templates</h2>
                      <span className="text-sm text-muted-foreground">
                        ({builtInTemplates.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {builtInTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Templates */}
                {customTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <LayoutTemplate className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Custom Templates</h2>
                      <span className="text-sm text-muted-foreground">
                        ({customTemplates.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredTemplates.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                      <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No templates found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      {searchQuery
                        ? "No templates match your search"
                        : "No templates available"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
