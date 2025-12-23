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
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  Share2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { generatePRD, INTEGRATION_CONFIG } from "@/services/api";
import type { Project, Integration } from "@/types/database";
import { TextImprovementToolbar } from "./TextImprovementToolbar";
import { exportToPDF } from "@/utils/pdfExport";
import { cn } from "@/lib/utils";

type IntegrationProvider = keyof typeof INTEGRATION_CONFIG;

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
  // Track if we're in "review mode" - showing AI suggestion
  const [isReviewMode, setIsReviewMode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [selectedProjectForSave, setSelectedProjectForSave] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportingProvider, setExportingProvider] = useState<IntegrationProvider | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);

  // Load connected integrations
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const { data, error } = await supabase
          .from('integrations')
          .select('*')
          .eq('status', 'connected');
        
        if (!error && data) {
          setConnectedIntegrations(data);
        }
      } catch (err) {
        console.log('Could not load integrations:', err);
      }
    };
    loadIntegrations();
  }, []);

  // Update versions when content changes
  useEffect(() => {
    if (content && content !== versions[currentVersionIndex]?.content) {
      const newVersion = { content, timestamp: Date.now() };
      setVersions(prev => [...prev.slice(0, currentVersionIndex + 1), newVersion]);
      setCurrentVersionIndex(prev => prev + 1);
    }
  }, [content]);

  const currentContent = versions[currentVersionIndex]?.content || content;

  // For review mode, we show the content with regenerated text substituted
  // The highlighting is done via the Confirm/Decline toolbar UI
  const displayedContent = 
    isReviewMode && regeneratedText && selectionRange
      ? currentContent.slice(0, selectionRange.start) +
        regeneratedText +
        currentContent.slice(selectionRange.end)
      : currentContent;

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

  const handleExportToIntegration = async (provider: IntegrationProvider) => {
    if (!currentContent) return;
    
    const integration = connectedIntegrations.find(i => i.provider === provider);
    const config = INTEGRATION_CONFIG[provider];
    
    setIsExporting(true);
    setExportingProvider(provider);
    
    try {
      toast.info(`Exporting to ${config.name}...`);
      
      const { data, error } = await supabase.functions.invoke("export-to-integration", {
        body: {
          provider,
          title: title || "PRD Document",
          content: currentContent,
          integrationConfig: integration?.config_json,
        },
      });

      if (error) {
        console.error(`Export to ${config.name} error:`, error);
        toast.error(error.message || `Failed to export to ${config.name}`);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(data.message || `Exported to ${config.name} successfully`);
        if (data.url) {
          window.open(data.url, "_blank");
        }
      }
    } catch (error) {
      console.error(`Failed to export to ${config.name}:`, error);
      toast.error(`Failed to export to ${config.name}`);
    } finally {
      setIsExporting(false);
      setExportingProvider(null);
    }
  };

  const isIntegrationConnected = (provider: IntegrationProvider) => {
    return connectedIntegrations.some(i => i.provider === provider && i.status === 'connected');
  };

  // Handle text selection - show floating toolbar
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();

    if (selected && selected.length > 3 && contentRef.current) {
      // Check if selection is within our content
      try {
        const range = selection?.getRangeAt(0);
        if (range && contentRef.current.contains(range.commonAncestorContainer)) {
          setSelectedText(selected);

          // Get selection position for floating toolbar
          const rect = range.getBoundingClientRect();
          // Position toolbar centered below selection, using viewport coordinates
          setSelectionPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 12,
          });

          // Get selection position in content for replacement
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(contentRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          const start = preSelectionRange.toString().length;
          const end = start + selected.length;
          setSelectionRange({ start, end });
        }
      } catch (e) {
        // Selection might be invalid
      }
    }
  };

  // Clear selection state (but don't clear browser selection to keep highlight)
  const clearSelectionState = () => {
    if (regeneratedText) return; // Don't clear while showing result
    setSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
  };

  // Use effect to add global pointer listeners for better selection detection
  useEffect(() => {
    const checkSelection = () => {
      const selection = window.getSelection();
      const selected = selection?.toString().trim();

      if (selected && selected.length > 3 && contentRef.current) {
        try {
          const range = selection?.getRangeAt(0);
          if (range && contentRef.current.contains(range.commonAncestorContainer)) {
            setSelectedText(selected);

            const rect = range.getBoundingClientRect();
            // Position toolbar centered below selection
            setSelectionPosition({
              x: rect.left + rect.width / 2,
              y: rect.bottom + 12,
            });

            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(contentRef.current);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;
            const end = start + selected.length;
            setSelectionRange({ start, end });
          }
        } catch (e) {
          // Selection might be invalid
        }
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      // Small delay to ensure selection is complete
      setTimeout(checkSelection, 20);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key.startsWith("Arrow")) {
        setTimeout(checkSelection, 20);
      }
    };

    // Also listen to selectionchange for more reliable detection
    const handleSelectionChange = () => {
      // Debounce selection change to avoid too many calls
      setTimeout(checkSelection, 50);
    };

    document.addEventListener("pointerup", handleGlobalPointerUp, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("pointerup", handleGlobalPointerUp, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [regeneratedText]);

  // Clear selection when the user clicks outside the content/toolbar
  const handlePointerDownOutside = (e: React.PointerEvent) => {
    if (regeneratedText) return;

    const target = e.target as HTMLElement;

    // Don't clear if interacting with the toolbar
    if (target.closest("[data-toolbar]")) return;

    // Don't clear if the pointer-down started inside the content (common when selecting text)
    if (contentRef.current?.contains(target)) return;

    clearSelectionState();
    window.getSelection()?.removeAllRanges();
  };

  // Regenerate selected text with AI - called from floating toolbar
  const handleImprove = async (prompt: string) => {
    setIsRegenerating(true);
    setRegeneratedText(null);
    // Clear the browser selection but keep our state for positioning
    window.getSelection()?.removeAllRanges();

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
      setIsReviewMode(true);
    } catch (error) {
      console.error("Failed to improve text:", error);
      toast.error("Failed to improve text");
      setRegeneratedText(null);
      setIsReviewMode(false);
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

    // Clear all selection state
    setSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setRegeneratedText(null);
    setIsReviewMode(false);
    toast.success("Changes applied");
  };

  // Reject improved text - also clears selection state
  const handleRejectImproved = () => {
    setRegeneratedText(null);
    setSelectedText("");
    setSelectionRange(null);
    setSelectionPosition(null);
    setIsReviewMode(false);
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
      <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[120px]">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <h2 className="font-medium text-xs truncate" title={title || "PRD Preview"}>
            {title || "PRD"}
          </h2>
          {isStreaming && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {versions.length > 1 && (
            <>
              <span className="text-xs text-muted-foreground mr-1">
                v{currentVersionIndex + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRollback}
                disabled={currentVersionIndex === 0}
                title="Previous version"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRollForward}
                disabled={currentVersionIndex === versions.length - 1}
                title="Next version"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {onSaveToProject && currentContent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowProjectDialog(true)}
              title="Save to Project"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={!currentContent}
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadMarkdown}>
                <FileText className="h-4 w-4 mr-2" />
                Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={!currentContent || isExporting}
                title="Export to..."
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Export to Integration
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(INTEGRATION_CONFIG) as IntegrationProvider[]).map((provider) => {
                const config = INTEGRATION_CONFIG[provider];
                const isConnected = isIntegrationConnected(provider);
                const isThisExporting = isExporting && exportingProvider === provider;
                
                return (
                  <DropdownMenuItem
                    key={provider}
                    onClick={() => handleExportToIntegration(provider)}
                    disabled={isExporting || !isConnected}
                    className="flex items-center gap-2"
                  >
                    <span className="text-base">{config.icon}</span>
                    <span className="flex-1">{config.name}</span>
                    {isThisExporting && <Loader2 className="h-3 w-3 animate-spin" />}
                    {!isConnected && (
                      <span className="text-xs text-muted-foreground">(Not connected)</span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              {connectedIntegrations.length === 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Connect integrations in Settings → Integrations
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            disabled={!currentContent}
            title="Copy raw markdown"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCollapse}
              title="Collapse panel"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          )}

        </div>
      </div>

      {/* Floating Text Improvement Toolbar - show for selection & loading */}
      {!regeneratedText && (
        <TextImprovementToolbar
          selectedText={selectedText}
          position={selectionPosition}
          onImprove={handleImprove}
          isProcessing={isRegenerating}
          improvedText={regeneratedText}
          onAccept={handleAcceptImproved}
          onReject={handleRejectImproved}
        />
      )}
      
      {/* Floating Confirm/Decline panel when reviewing improved text */}
      {isReviewMode && regeneratedText && selectionPosition && (
        <div
          data-toolbar
          className="fixed z-[1000] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: Math.max(16, Math.min(selectionPosition.x - 200, window.innerWidth - 416)),
            top: Math.max(16, selectionPosition.y),
            width: 400,
          }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">AI Suggestion</span>
            </div>
            
            {/* Comparison */}
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Original</span>
                <div className="mt-1 p-2 bg-muted/50 rounded text-sm line-through opacity-60 max-h-16 overflow-y-auto">
                  {selectedText.length > 150 ? selectedText.slice(0, 150) + "..." : selectedText}
                </div>
              </div>
              <div>
                <span className="text-xs text-primary uppercase tracking-wide font-medium">Improved</span>
                <div className="mt-1 p-2 bg-primary/10 border border-primary/20 rounded text-sm max-h-16 overflow-y-auto">
                  {regeneratedText.length > 150 ? regeneratedText.slice(0, 150) + "..." : regeneratedText}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectImproved}
                className="h-8 px-3 gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptImproved}
                className="h-8 px-3 gap-1.5 gradient-brand text-primary-foreground"
              >
                <Check className="h-3.5 w-3.5" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1" onPointerDownCapture={handlePointerDownOutside}>
        {displayedContent ? (
          <article
            ref={contentRef}
            className={cn(
              "px-6 py-6 max-w-4xl mx-auto select-text cursor-text text-selectable",
              (selectedText || isReviewMode) && "has-active-selection",
              isReviewMode && "ring-2 ring-primary/20 rounded-lg"
            )}
          >
            {isReviewMode && regeneratedText ? (
              // In review mode: show content with the improved text in place
              // The Confirm/Decline toolbar provides context about what changed
              <div className="relative">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={components}
                >
                  {displayedContent}
                </ReactMarkdown>
                {/* Visual indicator that content is being previewed */}
                <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs px-2 py-1 rounded-bl-lg border-l border-b border-primary/20">
                  Preview
                </div>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
              >
                {displayedContent}
              </ReactMarkdown>
            )}
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
