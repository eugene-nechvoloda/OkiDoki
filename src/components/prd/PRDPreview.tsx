import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Check,
  X,
  FileText,
  Save,
  Download,
  History,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { generatePRD } from "@/services/api";
import { cn } from "@/lib/utils";

interface PRDPreviewProps {
  content: string;
  title?: string;
  onClose: () => void;
  isStreaming?: boolean;
  onSaveToProject?: () => void;
}

interface Version {
  content: string;
  timestamp: number;
}

export function PRDPreview({
  content,
  title,
  onClose,
  isStreaming,
  onSaveToProject
}: PRDPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<Version[]>([{ content, timestamp: Date.now() }]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedText, setRegeneratedText] = useState("");
  const [showRegenerateUI, setShowRegenerateUI] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update versions when content changes
  useEffect(() => {
    if (content && content !== versions[currentVersionIndex]?.content) {
      const newVersion = { content, timestamp: Date.now() };
      setVersions(prev => [...prev.slice(0, currentVersionIndex + 1), newVersion]);
      setCurrentVersionIndex(prev => prev + 1);
    }
  }, [content]);

  const currentContent = versions[currentVersionIndex]?.content || content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    toast.success("PRD copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "PRD"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PRD downloaded");
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();

    if (selected && selected.length > 0) {
      setSelectedText(selected);

      // Get selection position in content
      if (contentRef.current) {
        const range = selection?.getRangeAt(0);
        if (range) {
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(contentRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          const start = preSelectionRange.toString().length;
          const end = start + selected.length;
          setSelectionRange({ start, end });
        }
      }
    } else {
      setSelectedText("");
      setSelectionRange(null);
      setShowRegenerateUI(false);
    }
  };

  // Regenerate selected text with AI
  const handleRegenerate = async () => {
    if (!selectedText) return;

    setIsRegenerating(true);
    setRegeneratedText("");

    try {
      const prompt = `Rewrite and improve the following text while maintaining its meaning and context:\n\n${selectedText}\n\nProvide ONLY the rewritten text, without any additional explanation or context.`;

      let fullResponse = "";
      await generatePRD(
        {
          messages: [{ role: "user", content: prompt }],
          settings: { tone: "balanced", docType: "single", hierarchy: "1-level" },
        },
        (chunk) => {
          fullResponse += chunk;
          setRegeneratedText(fullResponse);
        }
      );

      setShowRegenerateUI(true);
    } catch (error) {
      console.error("Failed to regenerate text:", error);
      toast.error("Failed to regenerate text");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Accept regenerated text
  const handleAccept = () => {
    if (!selectionRange || !regeneratedText) return;

    const newContent =
      currentContent.slice(0, selectionRange.start) +
      regeneratedText +
      currentContent.slice(selectionRange.end);

    const newVersion = { content: newContent, timestamp: Date.now() };
    setVersions(prev => [...prev.slice(0, currentVersionIndex + 1), newVersion]);
    setCurrentVersionIndex(prev => prev + 1);

    setShowRegenerateUI(false);
    setSelectedText("");
    setSelectionRange(null);
    setRegeneratedText("");
    toast.success("Changes accepted");

    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  // Decline regenerated text
  const handleDecline = () => {
    setShowRegenerateUI(false);
    setRegeneratedText("");
    toast.info("Changes declined");
  };

  // Rollback to previous version
  const handleRollback = () => {
    if (currentVersionIndex > 0) {
      setCurrentVersionIndex(prev => prev - 1);
      toast.success("Rolled back to previous version");
    }
  };

  // Roll forward to next version
  const handleRollForward = () => {
    if (currentVersionIndex < versions.length - 1) {
      setCurrentVersionIndex(prev => prev + 1);
      toast.success("Restored to next version");
    }
  };

  // Custom components for better styling
  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground border-b pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-5 mb-2 text-foreground">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold mt-4 mb-2 text-foreground">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="mb-4 text-foreground/90 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 text-foreground/90">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 text-foreground/90">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground">
        {children}
      </em>
    ),
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {children}
        </code>
      ) : (
        <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4 text-foreground">
          {children}
        </code>
      ),
    pre: ({ children }) => (
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-foreground/80">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-border">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr>
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-foreground/90">
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    ),
    hr: () => (
      <hr className="my-6 border-border" />
    ),
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-medium text-sm truncate max-w-[200px]">
            {title || "PRD Preview"}
          </h2>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Writing...
            </span>
          )}
          {versions.length > 1 && (
            <span className="text-xs text-muted-foreground">
              v{currentVersionIndex + 1}/{versions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Version history controls */}
          {versions.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRollback}
                disabled={currentVersionIndex === 0}
                title="Previous version"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRollForward}
                disabled={currentVersionIndex === versions.length - 1}
                title="Next version"
              >
                <History className="h-4 w-4" />
              </Button>
            </>
          )}

          {onSaveToProject && currentContent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onSaveToProject}
              title="Save to Project"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            title="Download as Markdown"
            disabled={!currentContent}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            disabled={!currentContent}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedText && !showRegenerateUI && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedText.length} characters selected
          </span>
          <Button
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="gradient-brand text-primary-foreground"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {isRegenerating ? "Regenerating..." : "Regenerate with AI"}
          </Button>
        </div>
      )}

      {/* Regenerate comparison UI */}
      {showRegenerateUI && (
        <div className="px-4 py-3 bg-muted/50 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">AI Suggestion</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                className="h-7"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="gradient-brand text-primary-foreground h-7"
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Accept
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Original:</span>
              <div className="p-2 bg-card rounded border border-border text-sm">
                {selectedText}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Regenerated:</span>
              <div className="p-2 bg-primary/5 rounded border border-primary/20 text-sm">
                {regeneratedText || "Generating..."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        {currentContent ? (
          <article
            ref={contentRef}
            className="px-6 py-6 max-w-4xl mx-auto select-text"
            onMouseUp={handleTextSelection}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {currentContent}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No PRD yet</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Start a conversation to generate your PRD
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
