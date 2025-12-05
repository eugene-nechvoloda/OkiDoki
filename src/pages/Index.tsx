import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PRDPreview } from "@/components/prd/PRDPreview";
import { useChat } from "@/hooks/useChat";

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  // Show preview when we have PRD content
  const shouldShowPreview = showPreview || (prdContent && prdContent.length > 100);

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
              onClose={() => setShowPreview(false)}
              isStreaming={isLoading && !!streamingContent}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
