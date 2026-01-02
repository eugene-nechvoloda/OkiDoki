import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import type { Backlog, BacklogItem } from "@/types/backlog";

const BACKLOG_STORAGE_KEY = "okidoki_backlogs";

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
    </MainLayout>
  );
}
