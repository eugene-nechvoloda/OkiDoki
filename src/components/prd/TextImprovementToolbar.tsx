import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Minimize2,
  Maximize2,
  FileText,
  Zap,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TextImprovementToolbarProps {
  selectedText: string;
  position: { x: number; y: number } | null;
  onImprove: (prompt: string) => Promise<void>;
  isProcessing: boolean;
  improvedText: string | null;
  onAccept: () => void;
  onReject: () => void;
}

const CANNED_OPTIONS = [
  { label: "Make shorter", prompt: "Make this text shorter and more concise while preserving the key meaning:", icon: Minimize2 },
  { label: "More detailed", prompt: "Expand this text with more details and examples while maintaining clarity:", icon: Maximize2 },
  { label: "Make simpler", prompt: "Simplify this text to be easier to understand, using plain language:", icon: FileText },
  { label: "Less technical", prompt: "Rewrite this text to be less technical and more accessible to a general audience:", icon: Zap },
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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Reset state when selection changes
  useEffect(() => {
    setCustomPrompt("");
    setShowCustomInput(false);
  }, [selectedText]);

  if (!position || !selectedText) return null;

  const handleCannedOption = (prompt: string) => {
    onImprove(`${prompt}\n\n${selectedText}`);
  };

  const handleCustomSubmit = () => {
    if (customPrompt.trim()) {
      onImprove(`${customPrompt}\n\nText to improve:\n${selectedText}`);
    }
  };

  // Calculate position to keep toolbar in viewport
  const toolbarStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.max(16, Math.min(position.x - 150, window.innerWidth - 340)),
    top: Math.max(16, position.y - 10),
    zIndex: 1000,
  };

  // Show result comparison view
  if (improvedText) {
    return (
      <div
        ref={toolbarRef}
        data-toolbar
        style={{ ...toolbarStyle, width: "400px" }}
        className="bg-card border border-border rounded-lg shadow-lg p-4 space-y-3 animate-in fade-in-0 zoom-in-95"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Suggestion
          </span>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Original:</span>
            <div className="p-2 bg-muted/50 rounded text-sm max-h-24 overflow-y-auto">
              {selectedText}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Improved:</span>
            <div className="p-2 bg-primary/5 border border-primary/20 rounded text-sm max-h-24 overflow-y-auto">
              {improvedText}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Revert
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="h-8 gradient-brand text-primary-foreground"
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
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
        className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 animate-in fade-in-0 zoom-in-95"
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm">Improving text...</span>
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      data-toolbar
      style={toolbarStyle}
      className="bg-card border border-border rounded-lg shadow-lg p-2 animate-in fade-in-0 zoom-in-95"
    >
      {showCustomInput ? (
        <div className="flex items-center gap-2 p-1">
          <Input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="How should I improve this?"
            className="h-8 text-sm w-56"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") setShowCustomInput(false);
            }}
          />
          <Button
            size="sm"
            className="h-8 gradient-brand text-primary-foreground"
            onClick={handleCustomSubmit}
            disabled={!customPrompt.trim()}
          >
            <Sparkles className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setShowCustomInput(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {CANNED_OPTIONS.map((option) => (
            <Button
              key={option.label}
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => handleCannedOption(option.prompt)}
            >
              <option.icon className="h-3 w-3 mr-1" />
              {option.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-primary"
            onClick={() => setShowCustomInput(true)}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Custom
          </Button>
        </div>
      )}
    </div>
  );
}