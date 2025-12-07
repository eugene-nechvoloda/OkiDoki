import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Sliders,
  Send,
  Upload,
  Image,
  Link2,
  FolderOpen,
  Palette,
  Globe,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  FileText,
  FileStack,
  Layers,
  LayoutTemplate,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PRDTemplate, ChatSettings } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BUILT_IN_TEMPLATES } from "@/data/templates";

interface ChatInputProps {
  onSend: (message: string, settings: ChatSettings) => void;
  selectedTemplate?: PRDTemplate;
  onSelectTemplate: (template: PRDTemplate) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const TONES = [
  { id: "balanced", label: "Balanced", description: "Clear and professional" },
  { id: "detailed", label: "Detailed", description: "Thorough explanations" },
  { id: "concise", label: "Concise", description: "Straight to the point" },
  { id: "creative", label: "Creative", description: "More exploratory" },
];

const DOCUMENT_TYPES = [
  { id: "single", label: "Single document", description: "One comprehensive PRD" },
  { id: "project", label: "Project", description: "Multiple docs combined" },
];

const HIERARCHY_LEVELS = [
  { id: "1-level", label: "1 level", description: "Flat structure" },
  { id: "2-levels", label: "2 levels", description: "Parent with sections" },
  { id: "3-levels", label: "3+ levels", description: "Complex nested hierarchy" },
];

export function ChatInput({
  onSend,
  isLoading,
  placeholder = "Describe your product idea...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTone, setSelectedTone] = useState("balanced");
  const [selectedDocType, setSelectedDocType] = useState("single");
  const [selectedHierarchy, setSelectedHierarchy] = useState("1-level");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toneSubmenu, setToneSubmenu] = useState(false);
  const [docTypeSubmenu, setDocTypeSubmenu] = useState(false);
  const [hierarchySubmenu, setHierarchySubmenu] = useState(false);
  const [templateSubmenu, setTemplateSubmenu] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [uploadSubmenu, setUploadSubmenu] = useState(false);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim(), {
        tone: selectedTone,
        docType: selectedDocType,
        hierarchy: selectedHierarchy,
        templateId: selectedTemplateId,
      });
      setInput("");
      setUploadedFiles([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
      setAddMenuOpen(false);
      setUploadSubmenu(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentTone = TONES.find((t) => t.id === selectedTone);
  const currentDocType = DOCUMENT_TYPES.find((d) => d.id === selectedDocType);
  const currentHierarchy = HIERARCHY_LEVELS.find((h) => h.id === selectedHierarchy);
  const currentTemplate = selectedTemplateId 
    ? BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplateId) 
    : null;

  return (
    <div className="border border-border/60 rounded-2xl bg-card/80 backdrop-blur-sm shadow-elegant overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
      />
      
      {/* Uploaded files display */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-sm"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="border-0 resize-none min-h-[80px] max-h-[200px] focus-visible:ring-0 rounded-t-2xl text-base px-4 py-4"
        rows={2}
      />
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          {/* Add/Attach button */}
          <Popover open={addMenuOpen} onOpenChange={(open) => {
            setAddMenuOpen(open);
            if (!open) setUploadSubmenu(false);
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 rounded-xl transition-all",
                  addMenuOpen 
                    ? "bg-primary/15 text-primary" 
                    : "hover:bg-muted"
                )}
              >
                {addMenuOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1.5 rounded-xl" sideOffset={8}>
              {uploadSubmenu ? (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setUploadSubmenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Upload file</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Upload className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">From computer</span>
                  </button>
                  <button 
                    onClick={() => {
                      toast("Coming soon", {
                        description: "Google Drive integration will be available soon.",
                      });
                      setAddMenuOpen(false);
                      setUploadSubmenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium">From Google Drive</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <button 
                    onClick={() => setUploadSubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium">Upload file</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Image className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium">Add image</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Link2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium">Paste link</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <span className="text-sm font-medium">From project</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Settings/Config button */}
          <Popover open={toolsOpen} onOpenChange={(open) => {
            setToolsOpen(open);
            if (!open) {
              setToneSubmenu(false);
              setDocTypeSubmenu(false);
              setHierarchySubmenu(false);
              setTemplateSubmenu(false);
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 rounded-xl transition-all",
                  toolsOpen 
                    ? "bg-primary/15 text-primary" 
                    : "hover:bg-muted"
                )}
              >
                <Sliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1.5 rounded-xl" sideOffset={8}>
              {toneSubmenu ? (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setToneSubmenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Writing tone</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  {TONES.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => {
                        setSelectedTone(tone.id);
                        setToneSubmenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{tone.label}</div>
                        <div className="text-xs text-muted-foreground">{tone.description}</div>
                      </div>
                      {selectedTone === tone.id && (
                        <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : docTypeSubmenu ? (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setDocTypeSubmenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Document type</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  {DOCUMENT_TYPES.map((docType) => (
                    <button
                      key={docType.id}
                      onClick={() => {
                        setSelectedDocType(docType.id);
                        setDocTypeSubmenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{docType.label}</div>
                        <div className="text-xs text-muted-foreground">{docType.description}</div>
                      </div>
                      {selectedDocType === docType.id && (
                        <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : hierarchySubmenu ? (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setHierarchySubmenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Hierarchy levels</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  {HIERARCHY_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => {
                        setSelectedHierarchy(level.id);
                        setHierarchySubmenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{level.label}</div>
                        <div className="text-xs text-muted-foreground">{level.description}</div>
                      </div>
                      {selectedHierarchy === level.id && (
                        <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : templateSubmenu ? (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setTemplateSubmenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Template</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  <button
                    onClick={() => {
                      setSelectedTemplateId(null);
                      setTemplateSubmenu(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">Auto (LLM decides)</div>
                      <div className="text-xs text-muted-foreground">AI picks the best format</div>
                    </div>
                    {selectedTemplateId === null && (
                      <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                    )}
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  {BUILT_IN_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setTemplateSubmenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{template.description}</div>
                      </div>
                      {selectedTemplateId === template.id && (
                        <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setToneSubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-pink-500/10 flex items-center justify-center">
                        <Palette className="h-3.5 w-3.5 text-pink-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Tone</div>
                        <div className="text-xs text-muted-foreground">{currentTone?.label}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => setDocTypeSubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <FileStack className="h-3.5 w-3.5 text-teal-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Document type</div>
                        <div className="text-xs text-muted-foreground">{currentDocType?.label}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => setHierarchySubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Layers className="h-3.5 w-3.5 text-cyan-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Hierarchy</div>
                        <div className="text-xs text-muted-foreground">{currentHierarchy?.label}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => setTemplateSubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <LayoutTemplate className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Template</div>
                        <div className="text-xs text-muted-foreground">{currentTemplate?.name || "Auto (LLM decides)"}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

        </div>

        <div className="flex items-center gap-2">

          {/* Send button */}
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="sm"
            className={cn(
              "h-8 w-8 rounded-xl transition-all",
              input.trim()
                ? "gradient-brand text-primary-foreground shadow-glow hover:opacity-90"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
