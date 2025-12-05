import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TemplateSelector } from "./TemplateSelector";
import {
  Globe,
  FileText,
  Wand2,
  Paperclip,
  Send,
  ChevronDown,
} from "lucide-react";
import type { PRDTemplate } from "@/types";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  selectedTemplate?: PRDTemplate;
  onSelectTemplate: (template: PRDTemplate) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  selectedTemplate,
  onSelectTemplate,
  isLoading,
  placeholder = "Send a message..",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [writingMode, setWritingMode] = useState(true);

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

  return (
    <div className="border border-border rounded-2xl bg-card shadow-sm-custom">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="border-0 resize-none min-h-[60px] max-h-[200px] focus-visible:ring-0 rounded-t-2xl"
        rows={2}
      />
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
        <div className="flex items-center gap-1">
          {/* Project selector */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="text-sm">No Project</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* Template selector */}
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={onSelectTemplate}
          />

          {/* Writing mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWritingMode(!writingMode)}
            className={cn(
              "h-8 gap-1",
              writingMode
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm">Writing</span>
            {writingMode && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground">
                ON
              </span>
            )}
          </Button>

          {/* AI tools */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Wand2 className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* Auto */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <span className="text-sm">Auto</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-8 w-8 rounded-lg"
            variant={input.trim() ? "default" : "ghost"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
