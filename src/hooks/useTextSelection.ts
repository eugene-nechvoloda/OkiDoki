import { useState, useCallback, useRef, useEffect } from "react";

export interface SelectionState {
  text: string;
  range: { start: number; end: number } | null;
  position: { x: number; y: number } | null;
  rects: DOMRect[];
}

const EMPTY_STATE: SelectionState = {
  text: "",
  range: null,
  position: null,
  rects: [],
};

/**
 * Hook for managing text selection with persistent highlighting.
 * The selection state persists even when browser selection is cleared.
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY_STATE);
  const [isLocked, setIsLocked] = useState(false);
  const showDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLockedRef = useRef(false);

  // Keep ref in sync with state
  isLockedRef.current = isLocked;

  // Clear any pending timer - use inline function to avoid dependency issues
  const clearShowTimer = () => {
    if (showDelayTimerRef.current) {
      clearTimeout(showDelayTimerRef.current);
      showDelayTimerRef.current = null;
    }
  };

  // Capture selection from browser
  const captureSelection = useCallback(() => {
    if (isLockedRef.current) return;
    
    const browserSelection = window.getSelection();
    const selectedText = browserSelection?.toString().trim() || "";

    if (selectedText.length < 3 || !containerRef.current) {
      return;
    }

    try {
      const range = browserSelection?.getRangeAt(0);
      if (!range || !containerRef.current.contains(range.commonAncestorContainer)) {
        return;
      }

      // Get all client rects for the selection (handles multi-line)
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) return;

      // Compute a stable anchor under the whole selection (works for multi-line selections)
      const firstRect = rects[0];
      const bounds = rects.reduce(
        (acc, r) => ({
          minLeft: Math.min(acc.minLeft, r.left),
          maxRight: Math.max(acc.maxRight, r.right),
          maxBottom: Math.max(acc.maxBottom, r.bottom),
        }),
        { minLeft: firstRect.left, maxRight: firstRect.right, maxBottom: firstRect.bottom }
      );

      const position = {
        x: (bounds.minLeft + bounds.maxRight) / 2,
        y: bounds.maxBottom + 8,
      };

      // Calculate character offsets in the rendered text
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;
      const end = start + selectedText.length;

      setSelection({
        text: selectedText,
        range: { start, end },
        position,
        rects: rects.map(r => r.toJSON() as DOMRect),
      });
    } catch (e) {
      // Selection may be invalid
    }
  }, [containerRef]);

  // Lock selection (prevents updates) - call this when processing
  const lockSelection = useCallback(() => {
    setIsLocked(true);
    // Clear browser selection but keep our state
    window.getSelection()?.removeAllRanges();
  }, []);

  // Clear selection and unlock
  const clearSelection = useCallback(() => {
    clearShowTimer();
    setSelection(EMPTY_STATE);
    setIsLocked(false);
  }, []);

  // Update position only (for scroll handling)
  const updatePosition = useCallback((newPosition: { x: number; y: number }) => {
    setSelection(prev => ({ ...prev, position: newPosition }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handlePointerDown = () => {
      // User started selecting - cancel any pending toolbar show
      clearShowTimer();
    };

    const handlePointerUp = () => {
      // Wait 1 second after release to show toolbar
      clearShowTimer();
      showDelayTimerRef.current = setTimeout(() => {
        captureSelection();
      }, 1000);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key.startsWith("Arrow")) {
        // Same 1 second delay for keyboard selection
        clearShowTimer();
        showDelayTimerRef.current = setTimeout(() => {
          captureSelection();
        }, 1000);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("keyup", handleKeyUp, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      clearShowTimer();
    };
  }, [captureSelection]);

  return {
    selection,
    isLocked,
    lockSelection,
    clearSelection,
    updatePosition,
    hasSelection: selection.text.length > 0,
  };
}
