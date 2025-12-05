import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  FileText,
  FolderKanban,
  LayoutTemplate,
  Plus,
  Search,
  ChevronDown,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types";

interface SidebarProps {
  chats: Chat[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onNavigate: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS = [
  { id: "chats", label: "Chats", icon: MessageSquare, count: 0 },
  { id: "documents", label: "Documents", icon: FileText, count: 0 },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
];

export function Sidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [activeNav, setActiveNav] = useState("chats");

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    onNavigate(id);
  };

  if (isCollapsed) {
    return (
      <div className="h-full w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Button
          onClick={onNewChat}
          size="icon"
          className="gradient-brand text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex flex-col gap-2 mt-4">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent",
                activeNav === item.id && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">O</span>
            </div>
            <span className="font-medium">Personal account</span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewChat}
          className="w-full gradient-brand text-primary-foreground font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start New Chat
        </Button>
      </div>

      {/* Navigation */}
      <div className="p-2">
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => handleNavClick(item.id)}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent mb-1",
              activeNav === item.id && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {item.id === "chats" ? chats.length : item.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Usage */}
      <div className="px-4 py-3 mx-2 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground mb-2">
          You have used 0 of 3 free chats.
        </p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
          <div className="h-full w-0 gradient-brand rounded-full" />
        </div>
        <a href="#" className="text-xs text-primary hover:underline">
          Upgrade for $5 / month
        </a>
        <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
          Upgrade Now
        </Button>
      </div>

      {/* Recent Chats */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Recent</span>
          <span className="text-xs text-muted-foreground">All chats</span>
        </div>
        <ScrollArea className="flex-1 px-2">
          {chats.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4">No chats yet</p>
          ) : (
            chats.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full justify-start text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent mb-1 truncate",
                  currentChatId === chat.id && "bg-sidebar-accent"
                )}
              >
                {chat.title || "New Chat"}
              </Button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Search hint */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘ K</kbd>
          <span>to search</span>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-medium">E</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Eugene</p>
          <p className="text-xs text-muted-foreground">Free Trial</p>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
