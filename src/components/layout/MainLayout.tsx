import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChatSidebar } from "@/components/layout/ChatSidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, LayoutTemplate, Plug, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types";

interface MainLayoutProps {
  children: React.ReactNode;
  chats: Chat[];
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
}

type TabValue = "chats" | "projects" | "templates" | "integrations";

const TABS = [
  { id: "chats" as const, label: "Chats", icon: MessageSquare },
  { id: "projects" as const, label: "Projects", icon: FolderKanban },
  { id: "templates" as const, label: "Templates", icon: LayoutTemplate },
  { id: "integrations" as const, label: "Integrations", icon: Plug },
];

export function MainLayout({
  children,
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
}: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Determine active tab based on current route
  const getActiveTab = (): TabValue => {
    if (location.pathname === "/projects") return "projects";
    if (location.pathname === "/templates") return "templates";
    if (location.pathname === "/integrations") return "integrations";
    return "chats";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    if (tab === "chats") navigate("/");
    else if (tab === "projects") navigate("/projects");
    else if (tab === "templates") navigate("/templates");
    else if (tab === "integrations") navigate("/integrations");
  };

  // Only show sidebar when on chats tab
  const showSidebar = activeTab === "chats";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation Bar with Tabs */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
        <div className="w-[140px] flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">O</span>
          </div>
          <span className="font-semibold text-foreground">Outline</span>
        </div>

        <div className="flex-1 flex justify-center">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-muted/50">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "gap-2 data-[state=active]:bg-background",
                    activeTab === tab.id && "text-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="w-[140px]" /> {/* Spacer for balance - matches logo width */}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar - only visible on chats tab */}
        {showSidebar && (
          <ChatSidebar
            chats={chats}
            currentChatId={currentChatId}
            onNewChat={onNewChat}
            onSelectChat={onSelectChat}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
