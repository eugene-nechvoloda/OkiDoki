import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Message, Chat, PRDTemplate, ChatSettings } from "@/types";
import { BUILT_IN_TEMPLATES } from "@/data/templates";

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prd`;

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PRDTemplate>(
    BUILT_IN_TEMPLATES[0]
  );
  const [prdContent, setPrdContent] = useState("");

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChat(newChat);
    setStreamingContent("");
    setPrdContent("");
    return newChat;
  }, []);

  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
    }
  }, [chats]);

  const sendMessage = useCallback(
    async (content: string, settings: ChatSettings) => {
      let chat = currentChat;
      if (!chat) {
        chat = createNewChat();
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      // Update chat with user message
      const updatedChat: Chat = {
        ...chat,
        messages: [...chat.messages, userMessage],
        title: chat.messages.length === 0 ? content.slice(0, 50) : chat.title,
        updatedAt: new Date(),
      };

      setCurrentChat(updatedChat);
      setChats((prev) =>
        prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
      );

      setIsLoading(true);
      setStreamingContent("");

      // Get the template object if templateId is provided
      const template = settings.templateId 
        ? BUILT_IN_TEMPLATES.find(t => t.id === settings.templateId) || selectedTemplate
        : null;

      try {
        const response = await fetch(GENERATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedChat.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            template,
            settings: {
              tone: settings.tone,
              docType: settings.docType,
              hierarchy: settings.hierarchy,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (deltaContent) {
                fullContent += deltaContent;
                setStreamingContent(fullContent);
                
                // Update PRD content for preview
                if (fullContent.includes("# ") || fullContent.includes("## ")) {
                  setPrdContent(fullContent);
                }
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullContent,
          timestamp: new Date(),
        };

        const finalChat: Chat = {
          ...updatedChat,
          messages: [...updatedChat.messages, assistantMessage],
          updatedAt: new Date(),
        };

        setCurrentChat(finalChat);
        setChats((prev) =>
          prev.map((c) => (c.id === finalChat.id ? finalChat : c))
        );
        setStreamingContent("");
        setPrdContent(fullContent);
      } catch (error) {
        console.error("Error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to generate response");
      } finally {
        setIsLoading(false);
      }
    },
    [currentChat, createNewChat, selectedTemplate]
  );

  return {
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
    setPrdContent,
  };
}
