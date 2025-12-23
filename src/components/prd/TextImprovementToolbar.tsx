import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Minimize2,
  Maximize2,
  FileText,
  Lightbulb,
  Check,
  X,
  Loader2,
  Send,
} from "lucide-react";

interface TextImprovementToolbarProps {
  selectedText: string;
  position: { x: number; y: number } | null;
  onImprove: (prompt: string) => Promise<void>;
  isProcessing: boolean;
  improvedText: string | null;
  onAccept: () => void;
  onReject: () => void;
}

const QUICK_ACTIONS = [
  { label: "Shorter", prompt: "Make this text shorter and more concise while preserving the key meaning:", icon: Minimize2 },
  { label: "Longer", prompt: "Expand this text with more details, examples, and depth while maintaining clarity:", icon: Maximize2 },
  { label: "More detailed", prompt: "Add more specific details, data points, and concrete examples to this text:", icon: FileText },
  { label: "Rethink better", prompt: "Completely rethink and rewrite this text with a fresh perspective, improving clarity, structure, and impact:", icon: Lightbulb },
];

export function TextImprovementToolbar({
  selectedText,
  position,
  onImprove,
  isProcessing,
  improvedText,
  onAccept,
  onReject,
}: TextImprovementToolbarProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset custom prompt when selection changes (but keep it during processing)
  useEffect(() => {
    if (!isProcessing && !improvedText) {
      setCustomPrompt("");
    }
  }, [selectedText, isProcessing, improvedText]);

  // Focus input when toolbar appears
  useEffect(() => {
    if (position && !isProcessing && !improvedText && inputRef.current) {
      // Small delay to ensure toolbar is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [position, isProcessing, improvedText]);

  if (!position || !selectedText) return null;

  const handleQuickAction = (prompt: string) => {
    onImprove(`${prompt}\n\n${selectedText}`);
  };

  const handleCustomSubmit = () => {
    if (customPrompt.trim()) {
      onImprove(`${customPrompt}\n\nText to improve:\n${selectedText}`);
    }
  };

  // Calculate position to keep toolbar in viewport
  const toolbarWidth = improvedText ? 420 : 380;
  const padding = 16;
  
  // Clamp horizontal position to keep toolbar fully visible
  const clampedX = Math.max(
    padding + toolbarWidth / 2, 
    Math.min(position.x, window.innerWidth - padding - toolbarWidth / 2)
  );
  
  const toolbarStyle: React.CSSProperties = {
    position: "fixed",
    left: clampedX - toolbarWidth / 2,
    top: Math.max(padding, position.y),
    zIndex: 1000,
    width: toolbarWidth,
  };

  // Show result comparison view with Accept/Reject inline
  if (improvedText) {
    return (
      <div
        ref={toolbarRef}
        data-toolbar
        style={toolbarStyle}
        className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Suggestion</span>
          </div>
          <span className="text-xs text-muted-foreground">Review the changes below</span>
        </div>

        {/* Content comparison */}
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              Original
            </span>
            <div className="p-3 bg-muted/50 rounded-lg text-sm max-h-24 overflow-y-auto leading-relaxed line-through opacity-60">
              {selectedText}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-primary uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Improved
            </span>
            <div className="p-3 bg-primary/10 border-2 border-primary/30 rounded-lg text-sm max-h-24 overflow-y-auto leading-relaxed font-medium">
              {improvedText}
            </div>
          </div>
        </div>

        {/* Actions - prominent buttons */}
        <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Apply this change?</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="h-9 px-4 gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              className="h-9 px-4 gap-2 gradient-brand text-primary-foreground"
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isProcessing) {
    return (
      <div
        ref={toolbarRef}
        data-toolbar
        style={toolbarStyle}
        className="bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-center gap-3 py-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Improving your text...</span>
        </div>
      </div>
    );
  }

  // Main toolbar with input + quick actions
  return (
    <div
      ref={toolbarRef}
      data-toolbar
      style={toolbarStyle}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {/* Custom prompt input */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <Input
            ref={inputRef}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask AI to edit or improve..."
            className="h-9 text-sm border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && customPrompt.trim()) {
                e.preventDefault();
                handleCustomSubmit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onReject();
              }
            }}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0 gradient-brand text-primary-foreground"
            onClick={handleCustomSubmit}
            disabled={!customPrompt.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-2 flex flex-wrap gap-1">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="ghost"
            className="h-8 text-xs px-3 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => handleQuickAction(action.prompt)}
          >
            <action.icon className="h-3.5 w-3.5 mr-1.5" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
