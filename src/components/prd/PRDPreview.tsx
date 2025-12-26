import { createPortal } from "react-dom";
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
import { TextImprovementConfirmPanel } from "./TextImprovementConfirmPanel";
import { SelectionHighlight } from "./SelectionHighlight";
import { exportToPDF } from "@/utils/pdfExport";
import { useTextSelection } from "@/hooks/useTextSelection";
import { cn } from "@/lib/utils";

// Strip markdown formatting from text to preserve original style
const stripMarkdownFormatting = (text: string): string => {
  let cleaned = text;

  // Remove headers (# to ######) - must be at start of line or entire string
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove bold (**text** or __text__) - multiple passes to handle nested cases
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__(.+?)__/g, "$1");
  }

  // Remove italic (*text* or _text_) - careful not to break legitimate underscores
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");

  // Remove inline code
  cleaned = cleaned.replace(/`(.+?)`/g, "$1");

  // Remove strikethrough
  cleaned = cleaned.replace(/~~(.+?)~~/g, "$1");

  // Remove bullet points and list markers at the start
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove blockquote markers
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // Normalize whitespace and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
};

// Approximate conversion from markdown to visible text for matching selections
const approxMarkdownToVisibleText = (md: string): string => {
  return md
    .replace(/\r\n/g, "\n")
    // Images: keep alt text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    // Links: keep label text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    // Blockquotes / lists / headings markers
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    // Inline formatting
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_]+)_(?!_)/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
};

// Check if a position is inside an unclosed formatting block
const isInsideFormattingBlock = (
  markdown: string,
  position: number
): { isInside: boolean; marker: string; startPos: number } => {
  const beforeText = markdown.slice(0, position);
  
  // Check for bold markers (**)
  const boldMatches = beforeText.match(/\*\*/g) || [];
  if (boldMatches.length % 2 === 1) {
    // Odd number of ** means we're inside a bold block
    const lastBoldStart = beforeText.lastIndexOf("**");
    return { isInside: true, marker: "**", startPos: lastBoldStart };
  }
  
  // Check for italic markers (single *)
  // Need to be careful not to confuse with bold
  const cleanedForItalic = beforeText.replace(/\*\*/g, "");
  const italicMatches = cleanedForItalic.match(/\*/g) || [];
  if (italicMatches.length % 2 === 1) {
    const lastItalicStart = beforeText.lastIndexOf("*");
    // Make sure it's not part of **
    if (lastItalicStart > 0 && beforeText[lastItalicStart - 1] !== "*") {
      return { isInside: true, marker: "*", startPos: lastItalicStart };
    }
  }
  
  return { isInside: false, marker: "", startPos: -1 };
};

const findBestSelectionMatchIndex = (
  markdown: string,
  selectedText: string,
  selectionVisibleStart: number
): { index: number; isInsideFormatting: boolean; formatMarker: string; formatStartPos: number } => {
  if (!selectedText) return { index: -1, isInsideFormatting: false, formatMarker: "", formatStartPos: -1 };

  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestIsInsideFormatting = false;
  let bestFormatMarker = "";
  let bestFormatStartPos = -1;

  let fromIndex = 0;
  while (fromIndex <= markdown.length) {
    const idx = markdown.indexOf(selectedText, fromIndex);
    if (idx === -1) break;

    const visibleBefore = approxMarkdownToVisibleText(markdown.slice(0, idx)).length;
    const score = Math.abs(visibleBefore - selectionVisibleStart);

    if (score < bestScore) {
      bestScore = score;
      bestIndex = idx;
      
      // Check if the match position is inside a formatting block
      const formatInfo = isInsideFormattingBlock(markdown, idx);
      bestIsInsideFormatting = formatInfo.isInside;
      bestFormatMarker = formatInfo.marker;
      bestFormatStartPos = formatInfo.startPos;
      
      if (score === 0) break;
    }

    fromIndex = idx + selectedText.length;
  }

  return { 
    index: bestIndex, 
    isInsideFormatting: bestIsInsideFormatting, 
    formatMarker: bestFormatMarker,
    formatStartPos: bestFormatStartPos
  };
};

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
  
  // AI improvement state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedText, setRegeneratedText] = useState<string | null>(null);
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Use our custom selection hook
  const {
    selection,
    isLocked,
    lockSelection,
    clearSelection,
    hasSelection,
  } = useTextSelection(contentRef);
  
  // Dialog & export state
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

  // Compute displayed content - show improved text preview when reviewing
  const displayedContent = 
    isLocked && regeneratedText && selection.range
      ? currentContent.slice(0, selection.range.start) +
        regeneratedText +
        currentContent.slice(selection.range.end)
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

      // Use intelligent hierarchy export for Linear
      if (provider === 'linear') {
        const { data, error } = await supabase.functions.invoke("export-to-linear-hierarchy", {
          body: {
            title: title || "PRD Document",
            content: currentContent,
            teamId: integration?.config_json?.team_id,
            projectId: integration?.config_json?.project_id,
          },
        });

        if (error) {
          console.error(`Export to ${config.name} error:`, error);
          toast.error(error.message || `Failed to export to ${config.name}`);
          return;
        }

        if (data?.error || data?.errors) {
          const errorMsg = data?.error || (data?.errors?.length > 0 ? data.errors.join(', ') : 'Unknown error');
          toast.error(errorMsg);
          return;
        }

        if (data?.success) {
          const msg = data.message || `Created ${data.totalIssues} issues in ${config.name}`;
          toast.success(msg);
          if (data.rootIssue?.url) {
            window.open(data.rootIssue.url, "_blank");
          }
        }
        return;
      }

      // Use generic export for other integrations
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

  // Regenerate selected text with AI
  const handleImprove = async (prompt: string) => {
    lockSelection(); // Lock selection state
    setIsRegenerating(true);
    setRegeneratedText(null);

    try {
      let fullResponse = "";

      // Build explicit prompt with original text as reference
      const fullPrompt = `${prompt}

ORIGINAL TEXT (for reference - match this exact style):
"${selection.text}"

CRITICAL FORMATTING RULES:
- Return ONLY plain text with NO markdown formatting whatsoever
- Do NOT add: **bold**, _italic_, \`code\`, # headers, - bullets, or any other markdown
- Do NOT add line breaks, bullet points, or numbered lists
- The text should be plain prose that can be inserted directly into a paragraph
- Match the exact same formatting style as the original text above

Provide ONLY the improved text, nothing else:`;

      await generatePRD(
        {
          messages: [{ role: "user", content: fullPrompt }],
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
      clearSelection();
    } finally {
      setIsRegenerating(false);
    }
  };

  // Accept improved text
  const handleAcceptImproved = () => {
    if (!selection.range || !regeneratedText) return;

    // Strip any markdown formatting from the model output
    const cleanedText = stripMarkdownFormatting(regeneratedText);

    // Replace by matching the selected visible text inside the markdown source.
    // (The selection offsets are based on rendered text, not raw markdown.)
    const match = findBestSelectionMatchIndex(
      currentContent,
      selection.text,
      selection.range.start
    );

    if (match.index === -1) {
      toast.error("Couldn't apply changes: selected text not found in the document.");
      setRegeneratedText(null);
      clearSelection();
      return;
    }

    let newContent: string;
    
    if (match.isInsideFormatting && match.formatMarker) {
      // The selected text is inside a formatting block (e.g., bold)
      // We need to close the formatting before the replacement and reopen after
      // Check if there's content after the selection that's still inside the formatting
      const afterSelectionPos = match.index + selection.text.length;
      const afterText = currentContent.slice(afterSelectionPos);
      const closingMarkerPos = afterText.indexOf(match.formatMarker);
      
      if (closingMarkerPos !== -1) {
        // There's a closing marker - check if there's meaningful text before it
        const textBeforeClosing = afterText.slice(0, closingMarkerPos).trim();
        
        if (textBeforeClosing.length > 0) {
          // There's text after our selection that should stay formatted
          // Close format before our text, insert plain text, reopen format for remaining text
          newContent =
            currentContent.slice(0, match.index) +
            match.formatMarker + // Close the formatting
            cleanedText +
            match.formatMarker + // Reopen the formatting for text after
            currentContent.slice(afterSelectionPos);
        } else {
          // No meaningful text after - just close formatting before our text
          newContent =
            currentContent.slice(0, match.index) +
            match.formatMarker + // Close the formatting
            cleanedText +
            currentContent.slice(afterSelectionPos);
        }
      } else {
        // No closing marker found - just insert the text
        newContent =
          currentContent.slice(0, match.index) +
          cleanedText +
          currentContent.slice(afterSelectionPos);
      }
    } else {
      // Normal case - text is not inside formatting
      newContent =
        currentContent.slice(0, match.index) +
        cleanedText +
        currentContent.slice(match.index + selection.text.length);
    }

    const newVersion = { content: newContent, timestamp: Date.now() };
    setVersions(prev => [...prev.slice(0, currentVersionIndex + 1), newVersion]);
    setCurrentVersionIndex(prev => prev + 1);

    setRegeneratedText(null);
    clearSelection();
    toast.success("Changes applied");
  };

  // Reject improved text
  const handleRejectImproved = () => {
    setRegeneratedText(null);
    clearSelection();
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

  // Handle clicks outside selection - use document listener since toolbar is portaled
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isLocked || isRegenerating) return; // Don't clear while reviewing or processing
      if (!hasSelection) return;

      const target = e.target as HTMLElement;
      // Ignore clicks on toolbar
      if (target.closest("[data-toolbar]")) return;
      // Ignore clicks inside content area (user might be making new selection)
      if (contentRef.current?.contains(target)) return;

      clearSelection();
      window.getSelection()?.removeAllRanges();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLocked, isRegenerating, hasSelection, clearSelection]);

  // Custom components for markdown rendering
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

  // Determine if we're in review mode (showing AI suggestion)
  const isReviewMode = isLocked && regeneratedText !== null;

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

      {/* Floating Text Improvement Toolbar - only show when not reviewing */}
      {!isReviewMode && (
        <TextImprovementToolbar
          selectedText={selection.text}
          position={selection.position}
          onImprove={handleImprove}
          isProcessing={isRegenerating}
          improvedText={regeneratedText}
          onAccept={handleAcceptImproved}
          onReject={handleRejectImproved}
        />
      )}
      
      {/* Floating Confirm/Decline panel when reviewing improved text - rendered via portal */}
      {isReviewMode && selection.position &&
        createPortal(
          <TextImprovementConfirmPanel
            position={selection.position}
            selectionTop={selection.rects[0]?.top}
            originalText={selection.text}
            improvedText={regeneratedText}
            onConfirm={handleAcceptImproved}
            onDecline={handleRejectImproved}
          />,
          document.body
        )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div ref={scrollAreaRef} className="relative">
          {/* Selection highlight overlay */}
          {hasSelection && (
            <SelectionHighlight
              rects={selection.rects}
              containerRef={scrollAreaRef}
              variant={isReviewMode ? "improved" : "selection"}
            />
          )}
          
          {displayedContent ? (
            <article
              ref={contentRef}
              className={cn(
                "px-6 py-6 max-w-4xl mx-auto select-text cursor-text",
                isReviewMode && "ring-2 ring-primary/20 rounded-lg relative"
              )}
            >
              {isReviewMode && (
                <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs px-2 py-1 rounded-bl-lg border-l border-b border-primary/20">
                  Preview
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
              >
                {displayedContent}
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
        </div>
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
