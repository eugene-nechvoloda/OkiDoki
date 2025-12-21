import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Check,
  X,
  FileText,
  Save,
  Download,
  History,
  RotateCcw,
  FolderKanban,
  PanelRightClose,
  FileDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { generatePRD } from "@/services/api";
import type { Project } from "@/types/database";
import { TextImprovementToolbar } from "./TextImprovementToolbar";
import { exportToPDF } from "@/utils/pdfExport";

interface PRDPreviewProps {
  content: string;
  title?: string;
  onClose: () => void;
  onCollapse?: () => void;
  isStreaming?: boolean;
  onSaveToProject?: (projectId?: string) => void;
  projects?: Project[];
}

interface Version {
  content: string;
  timestamp: number;
}

export function PRDPreview({
  content,
  title,
  onClose,
  onCollapse,
  isStreaming,
  onSaveToProject,
  projects = [],
}: PRDPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<Version[]>([{ content, timestamp: Date.now() }]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedText, setRegeneratedText] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedProjectForSave, setSelectedProjectForSave] = useState<string | undefined>();

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
    toast.success("Raw markdown copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([currentContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "PRD"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PRD downloaded as Markdown");
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info("Generating PDF...");
      await exportToPDF(currentContent, title || "PRD");
      toast.success("PRD downloaded as PDF");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Handle text selection - show floating toolbar
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();

    if (selected && selected.length > 10) {
      setSelectedText(selected);

      // Get selection position for floating toolbar
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });

        // Get selection position in content for replacement
        if (contentRef.current) {
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(contentRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          const start = preSelectionRange.toString().length;
          const end = start + selected.length;
          setSelectionRange({ start, end });
        }
      }
    } else {
      // Only clear if no improved text is showing
      if (!regeneratedText) {
        setSelectedText("");
        setSelectionRange(null);
        setSelectionPosition(null);
      }
    }
  };

  // Clear selection when clicking outside
  const handleClickOutside = () => {
    if (!regeneratedText) {
      setSelectedText("");
      setSelectionRange(null);
      setSelectionPosition(null);
    }
  };

  // Regenerate selected text with AI - called from floating toolbar
  const handleImprove = async (prompt: string) => {
    setIsRegenerating(true);
    setRegeneratedText(null);

    try {
      let fullResponse = "";
      await generatePRD(
        {
          messages: [{ role: "user", content: prompt + "\n\nProvide ONLY the improved text, without any additional explanation." }],
          settings: { tone: "balanced", docType: "single", hierarchy: "1-level" },
        },
        (chunk) => {
          fullResponse += chunk;
        }
      );

      setRegeneratedText(fullResponse.trim());
    } catch (error) {
      console.error("Failed to improve text:", error);
      toast.error("Failed to improve text");
      setRegeneratedText(null);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Accept improved text
  const handleAcceptImproved = () => {
    if (!selectionRange || !regeneratedText) return;

    const newContent =
      currentContent.slice(0, selectionRange.start) +
      regeneratedText +
      currentContent.slice(selectionRange.end);

    const newVersion = { content: newContent, timestamp: Date.now() };
    setVersions(prev => [...prev.slice(0, currentVersionIndex + 1), newVersion]);
    setCurrentVersionIndex(prev => prev + 1);

    // Clear selection state
    setSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setRegeneratedText(null);
    toast.success("Changes applied");
    window.getSelection()?.removeAllRanges();
  };

  // Reject improved text
  const handleRejectImproved = () => {
    setRegeneratedText(null);
    toast.info("Changes discarded");
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
    code: ({ children, className }) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {children}
        </code>
      ) : (
        <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4 text-foreground">
          {children}
        </code>
      );
    },
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
              onClick={() => setShowProjectDialog(true)}
              title="Save to Project"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!currentContent}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadMarkdown}>
                <FileText className="h-4 w-4 mr-2" />
                Download as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCollapse}
              title="Collapse panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Floating Text Improvement Toolbar */}
      <TextImprovementToolbar
        selectedText={selectedText}
        position={selectionPosition}
        onImprove={handleImprove}
        isProcessing={isRegenerating}
        improvedText={regeneratedText}
        onAccept={handleAcceptImproved}
        onReject={handleRejectImproved}
      />

      {/* Content */}
      <ScrollArea className="flex-1">
        {currentContent ? (
          <article
            ref={contentRef}
            className="px-6 py-6 max-w-4xl mx-auto select-text"
            onMouseUp={handleTextSelection}
            onClick={handleClickOutside}
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

      {/* Project Selection Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save PRD to Project</DialogTitle>
            <DialogDescription>
              Choose a project or save without a project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {projects.length > 0 ? (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Project (Optional)
                </label>
                <Select
                  value={selectedProjectForSave}
                  onValueChange={setSelectedProjectForSave}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No project (save to root)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project (save to root)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4" />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No projects yet. The PRD will be saved to your root documents.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProjectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const projectId = selectedProjectForSave === "none" ? undefined : selectedProjectForSave;
                  onSaveToProject?.(projectId);
                  setShowProjectDialog(false);
                  setSelectedProjectForSave(undefined);
                }}
                className="gradient-brand text-primary-foreground"
              >
                <Save className="h-4 w-4 mr-2" />
                Save PRD
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
