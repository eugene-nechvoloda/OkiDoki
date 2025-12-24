import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface TextImprovementConfirmPanelProps {
  position: { x: number; y: number };
  selectionTop?: number;
  originalText: string;
  improvedText: string | null;
  onConfirm: () => void;
  onDecline: () => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export function TextImprovementConfirmPanel({
  position,
  selectionTop,
  originalText,
  improvedText,
  onConfirm,
  onDecline,
}: TextImprovementConfirmPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const measure = () => {
      setPanelHeight(el.getBoundingClientRect().height);
    };

    measure();

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);

    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [originalText, improvedText]);

  const padding = 16;
  const width = 400;
  const height = panelHeight || 280;

  const left = clamp(
    position.x - width / 2,
    padding,
    window.innerWidth - padding - width
  );

  // Prefer below the selection, but ensure the panel is always fully visible.
  let top = position.y;

  // If we'd overflow the bottom, first try placing above the selection.
  if (top + height + padding > window.innerHeight && typeof selectionTop === "number") {
    const above = selectionTop - height - 10;
    if (above >= padding) top = above;
  }

  // Final clamp so it can never be pushed below the viewport.
  top = clamp(top, padding, window.innerHeight - padding - height);

  return (
    <div
      ref={panelRef}
      data-toolbar
      className="fixed z-[9999] animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left,
        top,
        width,
        maxHeight: window.innerHeight - padding * 2,
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">AI Suggestion</span>
        </div>

        <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Original</span>
            <div className="mt-1 p-2 bg-muted/50 rounded text-sm line-through opacity-60 max-h-14 overflow-y-auto">
              {originalText.length > 120
                ? originalText.slice(0, 120) + "..."
                : originalText}
            </div>
          </div>
          <div>
            <span className="text-xs text-primary uppercase tracking-wide font-medium">Improved</span>
            <div className="mt-1 p-2 bg-primary/10 border border-primary/20 rounded text-sm max-h-14 overflow-y-auto">
              {improvedText && improvedText.length > 120
                ? improvedText.slice(0, 120) + "..."
                : improvedText}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            className="h-8 px-3 gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="h-8 px-3 gap-1.5 gradient-brand text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
