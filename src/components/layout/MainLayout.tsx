import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChatSidebar } from "@/components/layout/ChatSidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, LayoutTemplate, Plug, MessageSquare } from "lucide-react";
import okidokiLogo from "@/assets/logos/okidoki-logo.png";
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

  // Wrap callbacks to navigate to chats tab when interacting with chat sidebar
  const handleNewChat = () => {
    if (activeTab !== "chats") {
      navigate("/");
    }
    onNewChat();
  };

  const handleSelectChat = (chatId: string) => {
    if (activeTab !== "chats") {
      // Pass chatId in navigation state so Index.tsx can select it immediately
      navigate("/", { state: { chatId } });
    } else {
      onSelectChat(chatId);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation Bar with Tabs */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-center px-4 shrink-0">
        <div className="absolute left-4 flex items-center gap-2">
          <img src={okidokiLogo} alt="OkiDoki" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-foreground">OkiDoki</span>
        </div>

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
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar - always visible */}
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
