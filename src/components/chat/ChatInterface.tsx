import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuickActions } from "./QuickActions";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Badge } from "@/components/ui/badge";
import type { Message, PRDTemplate, QuickActionType, ChatSettings } from "@/types";
import { BUILT_IN_TEMPLATES } from "@/data/templates";
import { Sliders, FileText, Layers } from "lucide-react";
import okidokiLogo from "@/assets/logos/okidoki-logo.png";

interface ChatInterfaceProps {
  messages: Message[];
  selectedTemplate?: PRDTemplate | null;
  onSelectTemplate: (template: PRDTemplate | null) => void;
  onSendMessage: (message: string, settings: ChatSettings) => void;
  isLoading: boolean;
  streamingContent?: string;
}

const TONE_LABELS: Record<string, string> = {
  balanced: "Balanced",
  detailed: "Detailed",
  concise: "Concise",
  creative: "Creative",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  single: "Single doc",
  project: "Project pack",
};

const HIERARCHY_LABELS: Record<string, string> = {
  "1-level": "1 level",
  "2-levels": "2 levels",
  "3-levels": "3+ levels",
};

export function ChatInterface({
  messages,
  selectedTemplate,
  onSelectTemplate,
  onSendMessage,
  isLoading,
  streamingContent,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNewChat = messages.length === 0;
  
  // Track active settings for display
  const [activeSettings, setActiveSettings] = useState<ChatSettings>({
    tone: "balanced",
    docType: "single",
    hierarchy: "1-level",
    templateId: null,
  });
  
  const handleSendMessage = (message: string, settings: ChatSettings) => {
    setActiveSettings(settings);
    onSendMessage(message, settings);
  };
  
  const hasNonDefaultSettings = 
    activeSettings.tone !== "balanced" || 
    activeSettings.docType !== "single" || 
    activeSettings.hierarchy !== "1-level";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleQuickAction = (type: QuickActionType) => {
    const prompts: Record<QuickActionType, string> = {
      write: "Help me write a document using the PRD template",
      improve: "Help me improve an existing document",
      brainstorm: "Help me brainstorm new features for my product",
      feedback: "I want feedback on my product idea",
    };

    // Set default template for writing
    if (type === "write") {
      onSelectTemplate(BUILT_IN_TEMPLATES[0]);
    }

    // Use default settings for quick actions
    onSendMessage(prompts[type], {
      tone: "balanced",
      docType: "single",
      hierarchy: "1-level",
      templateId: type === "write" ? BUILT_IN_TEMPLATES[0].id : null,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      {!isNewChat && (
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>+ Project</span>
            <span>/</span>
            <span>...</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Active Settings Badges */}
            {hasNonDefaultSettings && (
              <div className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                {activeSettings.tone !== "balanced" && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                    {TONE_LABELS[activeSettings.tone]}
                  </Badge>
                )}
                {activeSettings.docType !== "single" && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                    <FileText className="h-3 w-3 mr-1" />
                    {DOC_TYPE_LABELS[activeSettings.docType]}
                  </Badge>
                )}
                {activeSettings.hierarchy !== "1-level" && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                    <Layers className="h-3 w-3 mr-1" />
                    {HIERARCHY_LABELS[activeSettings.hierarchy]}
                  </Badge>
                )}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {messages.length * 50} of 3000 words used
            </span>
          </div>
        </div>
      )}

      {/* Chat content */}
      <ScrollArea className="flex-1 px-6" ref={scrollRef}>
        {isNewChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
            {/* Welcome header */}
            <div className="text-center mb-8">
              <img src={okidokiLogo} alt="OkiDoki" className="w-20 h-20 mx-auto mb-6 drop-shadow-lg" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                How can I{" "}
                <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                  help you today
                </span>
                ?
              </h1>
            </div>

            {/* Centered input */}
            <div className="w-full max-w-2xl mb-4">
              <ChatInput
                onSend={handleSendMessage}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={onSelectTemplate}
                isLoading={isLoading}
              />
            </div>

            {/* Quick actions as horizontal chips */}
            <QuickActions onSelect={handleQuickAction} />

            {/* Help text */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Okidoki has a library of document templates for you to use!
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {streamingContent && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: new Date(),
                }}
              />
            )}
            {isLoading && !streamingContent && (
              <div className="flex gap-4 py-6">
                <img src={okidokiLogo} alt="OkiDoki" className="w-8 h-8 flex-shrink-0" />
                <div className="flex items-center gap-1 py-3">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input - only show at bottom when not new chat */}
      {!isNewChat && (
        <div className="p-4 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={onSelectTemplate}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
