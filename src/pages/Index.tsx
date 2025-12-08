import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PRDPreview } from "@/components/prd/PRDPreview";
import { useChat } from "@/hooks/useChat";
import { saveDocument, getProjects } from "@/services/api";
import type { Project } from "@/types/database";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewClosed, setPreviewClosed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const {
    chats,
    currentChat,
    isLoading,
    streamingContent,
    selectedTemplate,
    prdContent,
    setSelectedTemplate,
    createNewChat,
    selectChat,
    sendMessage,
  } = useChat();

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { projects: proj } = await getProjects({ limit: 100 });
      setProjects(proj);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }

  // Show preview when we have PRD content, unless manually closed
  const shouldShowPreview = !previewClosed && prdContent && prdContent.length > 100;

  // Handle saving PRD to project
  const handleSaveToProject = async (projectId?: string) => {
    if (!prdContent || prdContent.length < 50) {
      toast.error("No content to save");
      return;
    }

    try {
      await saveDocument({
        title: currentChat?.title || "Untitled PRD",
        contentMarkdown: prdContent,
        status: "draft",
        visibility: "private",
        projectId: projectId || undefined,
      });

      toast.success("PRD saved successfully");

      // Navigate to projects page
      setTimeout(() => {
        navigate("/projects");
      }, 1000);
    } catch (error) {
      console.error("Failed to save PRD:", error);
      toast.error("Failed to save PRD");
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChat?.id}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onNavigate={(view) => console.log("Navigate to:", view)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat */}
        <div className={shouldShowPreview ? "flex-1" : "flex-1"}>
          <ChatInterface
            messages={currentChat?.messages || []}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            streamingContent={streamingContent}
          />
        </div>

        {/* PRD Preview */}
        {shouldShowPreview && (
          <div className="w-[400px] xl:w-[480px] animate-slide-in-left">
            <PRDPreview
              content={prdContent || streamingContent}
              title={currentChat?.title}
              onClose={() => setPreviewClosed(true)}
              isStreaming={isLoading && !!streamingContent}
              onSaveToProject={handleSaveToProject}
              projects={projects}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
