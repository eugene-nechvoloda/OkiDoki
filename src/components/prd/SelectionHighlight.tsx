import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SelectionHighlightProps {
  rects: DOMRect[];
  containerRef: React.RefObject<HTMLElement | null>;
  variant?: "selection" | "improved";
}

/**
 * Renders visual highlight overlays for selected text.
 * Uses absolute positioning relative to a scrollable container.
 */
export function SelectionHighlight({
  rects,
  containerRef,
  variant = "selection",
}: SelectionHighlightProps) {
  const [adjustedRects, setAdjustedRects] = useState<Array<{ top: number; left: number; width: number; height: number }>>([]);

  useEffect(() => {
    if (!containerRef.current || rects.length === 0) {
      setAdjustedRects([]);
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop || 0;
    const scrollLeft = container.scrollLeft || 0;

    const adjusted = rects.map(rect => ({
      top: rect.top - containerRect.top + scrollTop,
      left: rect.left - containerRect.left + scrollLeft,
      width: rect.width,
      height: rect.height,
    }));

    setAdjustedRects(adjusted);
  }, [rects, containerRef]);

  if (adjustedRects.length === 0) return null;

  return (
    <>
      {adjustedRects.map((rect, i) => (
        <div
          key={i}
          className={cn(
            "absolute pointer-events-none transition-opacity duration-150",
            variant === "selection" && "bg-primary/20",
            variant === "improved" && "bg-green-500/20 ring-1 ring-green-500/30"
          )}
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}
    </>
  );
}
