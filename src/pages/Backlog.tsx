import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Backlog, BacklogItem } from "@/types/backlog";

const BACKLOG_STORAGE_KEY = "okidoki_backlogs";

export default function BacklogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [selectedBacklog, setSelectedBacklog] = useState<Backlog | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
  }, []);

  // Handle incoming backlog from navigation state
  useEffect(() => {
    const state = location.state as { backlog?: Backlog } | null;
    if (state?.backlog) {
      // Add new backlog to storage
      const newBacklogs = [state.backlog, ...backlogs.filter(b => b.id !== state.backlog!.id)];
      setBacklogs(newBacklogs);
      localStorage.setItem(BACKLOG_STORAGE_KEY, JSON.stringify(newBacklogs));
      setSelectedBacklog(state.backlog);
      
      // Expand all top-level items
      const topLevel = state.backlog.items.filter(i => i.depth === 0).map(i => i.id);
      setExpandedItems(new Set(topLevel));
      
      // Clear navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, backlogs, navigate, location.pathname]);

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

  const getChildren = (items: BacklogItem[], parentId: string): BacklogItem[] => {
    return items.filter(item => item.parentId === parentId);
  };

  const renderBacklogItem = (item: BacklogItem, items: BacklogItem[]) => {
    const children = getChildren(items, item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} className="group">
        <div
          className={cn(
            "flex items-start gap-2 py-3 px-3 rounded-lg transition-colors",
            "hover:bg-muted/50 cursor-pointer",
            item.depth === 0 && "bg-muted/30"
          )}
          style={{ marginLeft: `${item.depth * 24}px` }}
          onClick={() => hasChildren && toggleExpand(item.id)}
        >
          {/* Expand/Collapse Button */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-2 h-2 rounded-full bg-primary/50" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm text-foreground truncate">
                {item.title}
              </h4>
              {item.depth === 0 && (
                <Badge variant="secondary" className="text-xs">
                  Epic
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
            {item.requirements.length > 0 && (
              <ul className="space-y-1">
                {item.requirements.map((req, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="border-l border-border/50 ml-5">
            {children.map(child => renderBacklogItem(child, items))}
          </div>
        )}
      </div>
    );
  };

  // List view
  if (!selectedBacklog) {
    return (
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
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedBacklog(backlog);
                      const topLevel = backlog.items.filter(i => i.depth === 0).map(i => i.id);
                      setExpandedItems(new Set(topLevel));
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
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
    );
  }

  // Detail view
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedBacklog(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{selectedBacklog.prdTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {selectedBacklog.items.length} items • Created{" "}
              {new Date(selectedBacklog.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {selectedBacklog.items
            .filter(item => item.depth === 0)
            .map(item => renderBacklogItem(item, selectedBacklog.items))}
        </div>
      </ScrollArea>
    </div>
  );
}
