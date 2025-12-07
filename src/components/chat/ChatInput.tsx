import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Sliders,
  Zap,
  Send,
  ChevronDown,
  Upload,
  Image,
  Link2,
  FolderOpen,
  Palette,
  Sparkles,
  Globe,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  FileText,
  Brain,
  GitBranch,
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
import type { PRDTemplate } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string) => void;
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

const DEPTH_LEVELS = [
  { id: "light", label: "Light", value: 0.3 },
  { id: "moderate", label: "Moderate", value: 0.6 },
  { id: "deep", label: "Deep", value: 0.9 },
];

const STRUCTURES = [
  { id: "single", label: "Single document", description: "One comprehensive PRD" },
  { id: "tree-2", label: "Tree (2 levels)", description: "Parent with child documents" },
  { id: "tree-3", label: "Tree (3 levels)", description: "Deeper nested hierarchy" },
  { id: "tree-4", label: "Tree (4+ levels)", description: "Complex multi-level structure" },
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
  const [selectedDepth, setSelectedDepth] = useState("moderate");
  const [selectedStructure, setSelectedStructure] = useState("single");
  const [deepThinking, setDeepThinking] = useState(false);
  const [webResearch, setWebResearch] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toneSubmenu, setToneSubmenu] = useState(false);
  const [structureSubmenu, setStructureSubmenu] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [uploadSubmenu, setUploadSubmenu] = useState(false);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
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
  const currentDepth = DEPTH_LEVELS.find((d) => d.id === selectedDepth);
  const currentStructure = STRUCTURES.find((s) => s.id === selectedStructure);

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
              setStructureSubmenu(false);
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
              ) : structureSubmenu ? (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setStructureSubmenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Document structure</span>
                  </button>
                  <div className="h-px bg-border/50 my-1" />
                  {STRUCTURES.map((structure) => (
                    <button
                      key={structure.id}
                      onClick={() => {
                        setSelectedStructure(structure.id);
                        setStructureSubmenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium">{structure.label}</div>
                        <div className="text-xs text-muted-foreground">{structure.description}</div>
                      </div>
                      {selectedStructure === structure.id && (
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
                    onClick={() => setStructureSubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <GitBranch className="h-3.5 w-3.5 text-teal-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Structure</div>
                        <div className="text-xs text-muted-foreground">{currentStructure?.label}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Brain className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <div className="text-sm font-medium">Deep thinking</div>
                    </div>
                    <Switch
                      checked={deepThinking}
                      onCheckedChange={setDeepThinking}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="h-px bg-border/50 my-1" />

                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Globe className="h-3.5 w-3.5 text-cyan-600" />
                      </div>
                      <div className="text-sm font-medium">Web research</div>
                    </div>
                    <Switch
                      checked={webResearch}
                      onCheckedChange={setWebResearch}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="h-px bg-border/50 my-1" />

                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      <div className="text-sm font-medium">Research depth</div>
                    </div>
                    <div className="flex gap-1 ml-10">
                      {DEPTH_LEVELS.map((depth) => (
                        <button
                          key={depth.id}
                          onClick={() => setSelectedDepth(depth.id)}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all",
                            selectedDepth === depth.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          )}
                        >
                          {depth.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Quick toggle for deep thinking */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeepThinking(!deepThinking)}
            className={cn(
              "h-8 px-3 rounded-xl gap-1.5 text-xs font-medium transition-all",
              deepThinking 
                ? "bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500/20" 
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deep</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Depth indicator pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
            <span>Depth:</span>
            <span className="font-medium text-foreground">{currentDepth?.value}</span>
          </div>

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
