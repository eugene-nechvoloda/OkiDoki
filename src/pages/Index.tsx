import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PRDPreview } from "@/components/prd/PRDPreview";
import { useChat } from "@/hooks/useChat";
import { saveDocument, getFolders } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import type { Folder } from "@/types/database";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PanelRightClose } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [previewClosed, setPreviewClosed] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isGeneratingBacklog, setIsGeneratingBacklog] = useState(false);

  const {
    chats,
    currentChat,
    isLoading,
    streamingContent,
    selectedTemplate,
    prdContent,
    canRevert,
    setSelectedTemplate,
    createNewChat,
    selectChat,
    sendMessage,
    revertPrdContent,
  } = useChat();

  // Load folders on mount
  useEffect(() => {
    loadFolders();
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
      // Ensure template has the correct PRDTemplate shape
      const prdTemplate = {
        id: template.id,
        name: template.name,
        description: template.description || "",
        sections: Array.isArray(template.sections) ? template.sections : [],
        isBuiltIn: !!template.isBuiltIn,
      };
      setSelectedTemplate(prdTemplate);
    }

    // Clear the navigation state so refresh/back doesn't re-trigger.
    if (chatId || template) {
      navigate("/", { replace: true, state: null });
    }
  }, [location.state, navigate, selectChat, setSelectedTemplate]);

  async function loadFolders() {
    try {
      const { folders: f } = await getFolders({ limit: 100 });
      setFolders(f);
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  }

  // Show preview when we have PRD content, unless manually closed
  const shouldShowPreview = !previewClosed && prdContent && prdContent.length > 100;

  // Handle saving PRD to folder
  const handleSaveToFolder = async (folderId?: string) => {
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
        folderId: folderId || undefined,
      });

      toast.success("PRD saved successfully");

      // Navigate to documents page
      setTimeout(() => {
        navigate("/projects");
      }, 1000);
    } catch (error) {
      console.error("Failed to save PRD:", error);
      toast.error("Failed to save PRD");
    }
  };

  // Generate backlog from PRD
  const handleGenerateBacklog = async () => {
    if (!prdContent) return;
    
    setIsGeneratingBacklog(true);
    try {
      toast.info("Generating backlog from PRD...");
      
      const { data, error } = await supabase.functions.invoke("generate-backlog", {
        body: { prdContent, prdTitle: currentChat?.title || "Untitled PRD" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.backlog) {
        toast.success(`Generated ${data.backlog.items.length} backlog items`);
        navigate("/backlog", { state: { backlog: data.backlog } });
      }
    } catch (error) {
      console.error("Failed to generate backlog:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate backlog");
    } finally {
      setIsGeneratingBacklog(false);
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
                  onSaveToFolder={handleSaveToFolder}
                  folders={folders}
                  onRevert={revertPrdContent}
                  canRevert={canRevert}
                  onGenerateBacklog={handleGenerateBacklog}
                  isGeneratingBacklog={isGeneratingBacklog}
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
