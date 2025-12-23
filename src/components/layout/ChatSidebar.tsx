import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types";
import { useAuth } from "@/providers/AuthProvider";

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatSidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const { user, signOut } = useAuth();

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
      </div>
    );
  }

  return (
    <div className="h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-sidebar-foreground">
            Chat History
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
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

      {/* Recent Chats */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Recent</span>
          <span className="text-xs text-muted-foreground">{chats.length} chats</span>
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
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata.name || user.email || "User"}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium">
              {(user?.user_metadata?.name || user?.email || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
          </p>
          <p className="text-xs text-muted-foreground">Free Trial</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => signOut()}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
