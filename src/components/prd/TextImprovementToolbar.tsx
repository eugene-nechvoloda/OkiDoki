import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Minimize2,
  Maximize2,
  FileText,
  Lightbulb,
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
  
  // Don't render anything when we have improved text - parent handles the confirm/decline UI
  if (improvedText) return null;

  const handleQuickAction = (prompt: string) => {
    onImprove(`${prompt}\n\n${selectedText}`);
  };

  const handleCustomSubmit = () => {
    if (customPrompt.trim()) {
      onImprove(`${customPrompt}\n\nText to improve:\n${selectedText}`);
    }
  };

  // Calculate position to keep toolbar in viewport
  const toolbarWidth = 380;
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
    zIndex: 9999,
    width: toolbarWidth,
  };

  // Render via portal to document.body so position:fixed works correctly
  const portalContent = (
    <>
      {/* Show loading state */}
      {isProcessing && (
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
      )}

      {/* Main toolbar with input + quick actions */}
      {!isProcessing && (
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
      )}
    </>
  );

  return createPortal(portalContent, document.body);
}
