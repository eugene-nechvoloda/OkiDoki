import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  SlidersHorizontal,
  Timer,
  Send,
  ArrowUp,
  ChevronDown,
  Paperclip,
  Camera,
  Github,
  FolderOpen,
  Pen,
  Globe,
  Search,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
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

interface ChatInputProps {
  onSend: (message: string) => void;
  selectedTemplate?: PRDTemplate;
  onSelectTemplate: (template: PRDTemplate) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const STYLES = [
  { id: "normal", label: "Normal" },
  { id: "learning", label: "Learning" },
  { id: "concise", label: "Concise" },
  { id: "explanatory", label: "Explanatory" },
  { id: "formal", label: "Formal" },
];

const MODELS = [
  { id: "claude-sonnet-4-5", label: "Sonnet 4.5", description: "Best for everyday tasks" },
  { id: "claude-opus-4-1-20250805", label: "Opus 4.5", description: "Most capable for complex work" },
  { id: "claude-3-5-haiku-20241022", label: "Haiku 4.5", description: "Fastest for quick answers" },
];

export function ChatInput({
  onSend,
  selectedTemplate,
  onSelectTemplate,
  isLoading,
  placeholder = "How can I help you today?",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("normal");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [styleSubmenu, setStyleSubmenu] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel);

  return (
    <div className="border border-border rounded-2xl bg-card shadow-lg">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="border-0 resize-none min-h-[80px] max-h-[200px] focus-visible:ring-0 rounded-t-2xl text-base"
        rows={2}
      />
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1">
          {/* Add button */}
          <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-lg border-border",
                  addMenuOpen && "bg-primary/10 border-primary/50"
                )}
              >
                {addMenuOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2" sideOffset={8}>
              <div className="space-y-1">
                <div className="px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Search menu"
                    className="w-full bg-transparent text-sm text-muted-foreground outline-none"
                  />
                </div>
                <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Upload a file</span>
                </button>
                <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Take a screenshot</span>
                </button>
                <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Add from GitHub</span>
                </button>
                <button className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">🔗</span>
                    <span className="text-sm">Add from Google Drive</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Connect</span>
                </button>
                <DropdownMenuSeparator />
                <button className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Use a project</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Tools/Settings button */}
          <Popover open={toolsOpen} onOpenChange={(open) => {
            setToolsOpen(open);
            if (!open) setStyleSubmenu(false);
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg border-border"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2" sideOffset={8}>
              {styleSubmenu ? (
                <div className="space-y-1">
                  <button
                    onClick={() => setStyleSubmenu(false)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-muted-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Search styles</span>
                  </button>
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        setSelectedStyle(style.id);
                        setStyleSubmenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Pen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{style.label}</span>
                      </div>
                      {selectedStyle === style.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                  <DropdownMenuSeparator />
                  <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Create & edit styles</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Search menu"
                      className="w-full bg-transparent text-sm text-muted-foreground outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setStyleSubmenu(true)}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-accent text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Pen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Use style</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Extended thinking</span>
                    </div>
                    <Switch
                      checked={extendedThinking}
                      onCheckedChange={setExtendedThinking}
                    />
                  </div>
                  <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Research</span>
                    </div>
                    <Switch
                      checked={researchMode}
                      onCheckedChange={setResearchMode}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Web search</span>
                    </div>
                    <Switch
                      checked={webSearch}
                      onCheckedChange={setWebSearch}
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Extended thinking toggle button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setExtendedThinking(!extendedThinking)}
            className={cn(
              "h-9 w-9 rounded-lg border-border",
              extendedThinking && "bg-primary/10 border-primary text-primary"
            )}
          >
            <Timer className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <span className="text-sm font-medium">{currentModel?.label}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className="flex flex-col items-start gap-0.5 py-2.5"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{model.label}</span>
                    {selectedModel === model.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {model.description}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center justify-between">
                <span>More models</span>
                <ChevronRight className="h-4 w-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send button */}
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              "h-9 w-9 rounded-lg transition-colors",
              input.trim()
                ? "bg-primary/80 hover:bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
