import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  ListTodo,
  FileText,
  Clock,
  Trash2,
  ArrowLeft,
  FolderOpen,
  Folder,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { readGuestJson } from "@/services/guestStorage";
import { toast } from "sonner";
import type { Backlog, BacklogItem } from "@/types/backlog";

// Linear logo component
const LinearLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5765L1.22541 61.5228Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M.00842114 36.0092c-.15843.88-.02219 1.7931.40135 2.5869l22.2536 43.9074c.4237.836 1.1077 1.5075 1.9538 1.9187l43.9074 22.2536c.7939.4236 1.7069.5597 2.587.4014.0122-.0022.0245-.0045.0366-.0068l-71.2028-71.2026c-.00218.0116-.00435.0232-.00648.0347Z" />
    <path d="M96.6827 56.8819c-.2224.9485-.6889.0915-1.5764-.857L58.5939 19.5125c-.6889-.6889-.0915-1.81895.857-1.57648l37.2518 37.9428c0 0 .0799.9381-.02 1.0031Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M99.9916 63.9908c.1584-.88.0222-1.793-.4014-2.587L77.337 17.4964c-.4112-.8462-1.0827-1.5301-1.9187-1.9538L31.5109 0.410296c-.7938-.42354-1.7068-.55977-2.5869-.40135-.0116.00212-.0231.00429-.0347.00647l71.2027 71.2027c.0023-.0121.0046-.0243.0068-.0366L99.9916 63.9908Z" />
  </svg>
);

const BACKLOG_STORAGE_KEY = "okidoki_backlogs";

interface ExportProgress {
  current: number;
  total: number;
  currentItem: string;
  createdItems: Array<{ title: string; identifier: string }>;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export default function BacklogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { chats, currentChat, createNewChat, selectChat } = useChat();
  
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [selectedBacklog, setSelectedBacklog] = useState<Backlog | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BacklogItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load backlogs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(BACKLOG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Backlog[];
        setBacklogs(parsed);
      } catch (e) {
        console.error("Failed to parse backlogs:", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Get Linear integration from guest storage
  const getLinearIntegration = () => {
    const integrations = readGuestJson<Array<{ provider: string; config_json: Record<string, unknown> }>>(
      "okidoki_integrations",
      []
    );
    return integrations.find((i) => i.provider === "linear");
  };

  // Export backlog to Linear with streaming progress
  const handleExportToLinear = async (backlog: Backlog) => {
    const integration = getLinearIntegration();
    
    if (!integration?.config_json?.api_key) {
      toast.error("Linear not connected", {
        description: "Please connect Linear in the Integrations page first.",
      });
      navigate("/integrations");
      return;
    }

    const config = integration.config_json;
    if (!config.team_id) {
      toast.error("No team selected", {
        description: "Please select a Linear team in the Integrations page.",
      });
      navigate("/integrations");
      return;
    }

    setIsExporting(true);
    setExportProgress({
      current: 0,
      total: backlog.items.length,
      currentItem: "Starting export...",
      createdItems: [],
      isComplete: false,
      hasError: false,
    });

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-backlog-to-linear`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            backlogTitle: backlog.prdTitle,
            items: backlog.items,
            guestIntegration: {
              api_key: config.api_key,
              team_id: config.team_id,
              project_id: config.project_id || null,
            },
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              
              if (event.type === "progress") {
                setExportProgress(prev => ({
                  current: event.current || prev?.current || 0,
                  total: event.total || prev?.total || 0,
                  currentItem: event.item || "",
                  createdItems: event.identifier && event.success
                    ? [...(prev?.createdItems || []), { title: event.item, identifier: event.identifier }]
                    : prev?.createdItems || [],
                  isComplete: false,
                  hasError: false,
                }));
              } else if (event.type === "complete") {
                setExportProgress(prev => ({
                  ...prev!,
                  isComplete: true,
                  hasError: (event.result?.errors?.length || 0) > 0,
                }));
                
                if (event.result?.success) {
                  toast.success(`Exported ${event.result.totalIssues} issues to Linear`);
                } else if (event.result?.errors?.length > 0) {
                  toast.warning(`Exported with some errors`, {
                    description: `${event.result.totalIssues} created, ${event.result.errors.length} failed.`,
                  });
                }
              } else if (event.type === "error") {
                setExportProgress(prev => ({
                  ...prev!,
                  isComplete: true,
                  hasError: true,
                  errorMessage: event.error,
                }));
                toast.error("Export failed", { description: event.error });
              }
            } catch (e) {
              console.error("Failed to parse SSE event:", e);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Export error:", error);
        setExportProgress(prev => prev ? {
          ...prev,
          isComplete: true,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        } : null);
        toast.error("Export failed", {
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const closeProgressDialog = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setExportProgress(null);
  };

  // Handle incoming backlog from navigation state - only after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    const state = location.state as { backlog?: Backlog } | null;
    if (state?.backlog) {
      console.log("Received backlog with items:", state.backlog.items.length);
      
      // Add new backlog to storage
      setBacklogs(prev => {
        const newBacklogs = [state.backlog!, ...prev.filter(b => b.id !== state.backlog!.id)];
        localStorage.setItem(BACKLOG_STORAGE_KEY, JSON.stringify(newBacklogs));
        return newBacklogs;
      });
      
      setSelectedBacklog(state.backlog);
      
      // Clear navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isInitialized, location.state, navigate, location.pathname]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const deleteBacklog = (backlogId: string) => {
    const updated = backlogs.filter(b => b.id !== backlogId);
    setBacklogs(updated);
    localStorage.setItem(BACKLOG_STORAGE_KEY, JSON.stringify(updated));
    if (selectedBacklog?.id === backlogId) {
      setSelectedBacklog(null);
    }
  };

  const getChildren = useCallback((items: BacklogItem[], parentId: string | undefined): BacklogItem[] => {
    if (parentId === undefined) {
      // Get root items (those without parentId)
      return items.filter(item => !item.parentId);
    }
    return items.filter(item => item.parentId === parentId);
  }, []);

  const getParentChain = useCallback((items: BacklogItem[], item: BacklogItem): BacklogItem[] => {
    const chain: BacklogItem[] = [];
    let current = item;
    
    while (current.parentId) {
      const parent = items.find(i => i.id === current.parentId);
      if (parent) {
        chain.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return chain;
  }, []);

  const navigateToItem = (item: BacklogItem | null, items: BacklogItem[]) => {
    setSelectedItem(item);
    if (item) {
      const chain = getParentChain(items, item);
      setBreadcrumbs(chain);
    } else {
      setBreadcrumbs([]);
    }
  };

  const renderBacklogItemRow = (item: BacklogItem, items: BacklogItem[]) => {
    const children = getChildren(items, item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center gap-3 py-3 px-4 rounded-lg transition-colors",
            "hover:bg-muted/50 cursor-pointer border border-transparent",
            "hover:border-border/50"
          )}
          onClick={() => {
            if (hasChildren) {
              navigateToItem(item, items);
            }
          }}
        >
          {/* Expand/Collapse or Folder Icon */}
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            {hasChildren ? (
              <FolderOpen className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground truncate">
                {item.title}
              </span>
              {item.depth === 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Epic
                </Badge>
              )}
              {item.depth === 1 && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Feature
                </Badge>
              )}
              {hasChildren && (
                <span className="text-xs text-muted-foreground shrink-0">
                  ({children.length} items)
                </span>
              )}
            </div>
          </div>

          {/* Navigate into */}
          {hasChildren && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Inline Expanded Children */}
        {isExpanded && hasChildren && (
          <div className="ml-6 border-l border-border/50 pl-2">
            {children.map(child => renderBacklogItemRow(child, items))}
          </div>
        )}
      </div>
    );
  };

  const renderItemDetail = (item: BacklogItem, items: BacklogItem[]) => {
    const children = getChildren(items, item.id);
    const hasChildren = children.length > 0;

    return (
      <div className="space-y-6">
        {/* Item Header */}
        <div className="bg-muted/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            {item.depth === 0 && (
              <Badge variant="secondary">Epic</Badge>
            )}
            {item.depth === 1 && (
              <Badge variant="outline">Feature</Badge>
            )}
            {item.depth === 2 && (
              <Badge variant="outline" className="bg-background">Task</Badge>
            )}
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">{item.title}</h2>
          <p className="text-muted-foreground">{item.description}</p>
          
          {item.requirements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <h4 className="text-sm font-medium mb-2">Requirements</h4>
              <ul className="space-y-2">
                {item.requirements.map((req, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Children List */}
        {hasChildren && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Sub-items ({children.length})
            </h3>
            <div className="space-y-1">
              {children.map(child => renderBacklogItemRow(child, items))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Progress Dialog Component
  const renderProgressDialog = () => {
    const getStatusIcon = () => {
      if (!exportProgress) return null;
      if (exportProgress.hasError) {
        return (
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-6 w-6 text-destructive" />
          </div>
        );
      }
      if (exportProgress.isComplete) {
        return (
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-500" />
          </div>
        );
      }
      return (
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      );
    };

    const getStatusText = () => {
      if (!exportProgress) return "";
      if (exportProgress.hasError) return "Export Failed";
      if (exportProgress.isComplete) return "Export Complete";
      return "Exporting...";
    };

    const getStatusColor = () => {
      if (!exportProgress) return "text-foreground";
      if (exportProgress.hasError) return "text-destructive";
      if (exportProgress.isComplete) return "text-green-500";
      return "text-primary";
    };

    return (
      <Dialog open={exportProgress !== null} onOpenChange={(open) => !open && closeProgressDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinearLogo className="h-5 w-5" />
              Exporting to Linear
            </DialogTitle>
          </DialogHeader>
          
          {exportProgress && (
            <div className="space-y-4">
              {/* Status Indicator */}
              <div className="flex flex-col items-center gap-3 py-2">
                {getStatusIcon()}
                <span className={cn("font-medium text-lg", getStatusColor())}>
                  {getStatusText()}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {exportProgress.isComplete 
                      ? (exportProgress.hasError ? "Stopped" : "All issues created") 
                      : "Creating issues..."}
                  </span>
                  <span className="font-medium">
                    {exportProgress.current} / {exportProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(exportProgress.current / exportProgress.total) * 100} 
                  className={cn(
                    "h-2",
                    exportProgress.hasError && "[&>div]:bg-destructive",
                    exportProgress.isComplete && !exportProgress.hasError && "[&>div]:bg-green-500"
                  )}
                />
              </div>

              {/* Current Item */}
              {!exportProgress.isComplete && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span className="truncate text-muted-foreground">
                    {exportProgress.currentItem}
                  </span>
                </div>
              )}

              {/* Created Items List */}
              {exportProgress.createdItems.length > 0 && (
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {exportProgress.createdItems.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <Badge variant="outline" className="shrink-0 font-mono text-xs">
                          {item.identifier}
                        </Badge>
                        <span className="truncate text-foreground">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Error Message */}
              {exportProgress.hasError && exportProgress.errorMessage && (
                <div className="flex items-start gap-2 text-sm bg-destructive/10 rounded-lg p-3">
                  <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-destructive">{exportProgress.errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              {exportProgress.isComplete && (
                <Button 
                  onClick={closeProgressDialog} 
                  className="w-full"
                  variant={exportProgress.hasError ? "outline" : "default"}
                >
                  {exportProgress.hasError ? "Close" : "Done"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // List view - show all backlogs
  if (!selectedBacklog) {
    return (
      <MainLayout
        chats={chats}
        currentChatId={currentChat?.id}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
      >
        <div className="h-full flex flex-col bg-background">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ListTodo className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Backlogs</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Generated backlogs from your PRDs
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {backlogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <ListTodo className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">No backlogs yet</h3>
                  <p className="text-sm text-muted-foreground max-w-[300px]">
                    Generate a backlog from your PRD using the "Generate Backlog" option in the PRD preview menu.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {backlogs.map(backlog => (
                    <Card
                      key={backlog.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors group"
                      onClick={() => {
                        setSelectedBacklog(backlog);
                        setSelectedItem(null);
                        setBreadcrumbs([]);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">{backlog.prdTitle}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              disabled={isExporting}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportToLinear(backlog);
                              }}
                              title="Export to Linear"
                            >
                              {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LinearLogo className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBacklog(backlog.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ListTodo className="h-4 w-4" />
                            {backlog.items.length} items
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(backlog.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        {renderProgressDialog()}
      </MainLayout>
    );
  }

  // Backlog detail view
  const currentItems = selectedItem 
    ? getChildren(selectedBacklog.items, selectedItem.id)
    : getChildren(selectedBacklog.items, undefined);

  return (
    <MainLayout
      chats={chats}
      currentChatId={currentChat?.id}
      onNewChat={createNewChat}
      onSelectChat={selectChat}
    >
      <div className="h-full flex flex-col bg-background">
        {/* Header with Breadcrumbs */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (selectedItem) {
                    // Go up one level
                    if (breadcrumbs.length > 0) {
                      const parentItem = breadcrumbs[breadcrumbs.length - 1];
                      navigateToItem(parentItem, selectedBacklog.items);
                    } else {
                      setSelectedItem(null);
                      setBreadcrumbs([]);
                    }
                  } else {
                    setSelectedBacklog(null);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-1 text-sm flex-wrap">
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setBreadcrumbs([]);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {selectedBacklog.prdTitle}
                </button>
                
                {breadcrumbs.map((crumb) => (
                  <div key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <button
                      onClick={() => navigateToItem(crumb, selectedBacklog.items)}
                      className="text-primary hover:underline"
                    >
                      {crumb.title}
                    </button>
                  </div>
                ))}
                
                {selectedItem && (
                  <div className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">{selectedItem.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Export Button */}
            {!selectedItem && (
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => handleExportToLinear(selectedBacklog)}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinearLogo className="h-4 w-4" />
                )}
                Export to Linear
              </Button>
            )}
          </div>
          
          {!selectedItem && (
            <p className="text-sm text-muted-foreground mt-2">
              {selectedBacklog.items.length} total items • Created{" "}
              {new Date(selectedBacklog.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {selectedItem ? (
              // Show item detail and its children
              renderItemDetail(selectedItem, selectedBacklog.items)
            ) : (
              // Show root level items
              <div className="space-y-1">
                {currentItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items at this level
                  </div>
                ) : (
                  currentItems.map(item => renderBacklogItemRow(item, selectedBacklog.items))
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      {renderProgressDialog()}
    </MainLayout>
  );
}
