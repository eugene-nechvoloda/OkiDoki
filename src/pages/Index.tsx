import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PRDPreview } from "@/components/prd/PRDPreview";
import { useChat } from "@/hooks/useChat";
import { saveDocument, getProjects } from "@/services/api";
import type { Project } from "@/types/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PanelRightClose } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
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

  // If we navigated here by selecting a chat from another page, open it automatically.
  useEffect(() => {
    const state = location.state as { chatId?: string; selectedTemplate?: typeof selectedTemplate } | null;
    const chatId = state?.chatId;
    const template = state?.selectedTemplate;
    
    if (chatId) {
      selectChat(chatId);
    }
    
    if (template) {
      setSelectedTemplate(template);
    }
    
    // Clear the navigation state so refresh/back doesn't re-trigger.
    if (chatId || template) {
      navigate("/", { replace: true, state: null });
    }
  }, [location.state, navigate, selectChat, setSelectedTemplate]);

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
    <MainLayout
      chats={chats}
      currentChatId={currentChat?.id}
      onNewChat={createNewChat}
      onSelectChat={selectChat}
    >
      <div className="h-full flex overflow-hidden relative">
        {/* Chat */}
        <div className="flex-1">
          <ChatInterface
            messages={currentChat?.messages || []}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            streamingContent={streamingContent}
          />
        </div>

        {/* PRD Preview - Collapsible */}
        {shouldShowPreview && (
          <>
            {previewCollapsed ? (
              // Collapsed state - show expand button
              <div className="w-12 h-full border-l border-border bg-card flex flex-col items-center py-3 gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewCollapsed(false)}
                  title="Expand PRD Preview"
                  className="h-8 w-8"
                >
                  <PanelRightClose className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            ) : (
              // Expanded state - show full preview
              <div className="w-[480px] xl:w-[540px] animate-slide-in-left">
                <PRDPreview
                  content={prdContent || streamingContent}
                  title={currentChat?.title}
                  onClose={() => setPreviewClosed(true)}
                  onCollapse={() => setPreviewCollapsed(true)}
                  isStreaming={isLoading && !!streamingContent}
                  onSaveToProject={handleSaveToProject}
                  projects={projects}
                />
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
