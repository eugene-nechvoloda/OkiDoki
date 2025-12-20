import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { Message, Chat, PRDTemplate, ChatSettings } from "@/types";
import { BUILT_IN_TEMPLATES } from "@/data/templates";
import { saveChat, getChats, saveDocument, generatePRD } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";

export function useChat() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PRDTemplate>(
    BUILT_IN_TEMPLATES[0]
  );
  const [prdContent, setPrdContent] = useState("");

  // TEMPORARY: Debug logging
  useEffect(() => {
    console.log('🔍 useChat - User state changed:', user);
    console.log('🔍 useChat - User ID:', user?.id);
    console.log('🔍 useChat - User is null?', !user);
  }, [user]);

  // Load chat history on mount (works in guest mode too)
  useEffect(() => {
    async function loadChatHistory() {
      try {
        setIsLoadingHistory(true);
        const { chats: dbChats } = await getChats({ limit: 50 });

        // Convert database chats to app format
        const convertedChats: Chat[] = dbChats.map((dbChat) => ({
          id: dbChat.id,
          title: dbChat.title || "Untitled Chat",
          messages: [], // Messages are stored in messages_json
          createdAt: new Date(dbChat.created_at),
          updatedAt: new Date(dbChat.updated_at),
          settings: dbChat.settings_json || {},
        }));

        setChats(convertedChats);
      } catch (error) {
        console.error("Error loading chat history:", error);
        toast.error("Failed to load chat history");
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadChatHistory();
  }, [user]);

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
      console.log('📨 sendMessage called');
      console.log('📨 User at sendMessage time:', user);
      console.log('📨 User ID:', user?.id);


      // No-auth mode: allow sending messages even when user is null.

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
        let fullContent = "";

        // Use the new generatePRD API
        await generatePRD(
          {
            messages: updatedChat.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            template: template || undefined,
            settings: {
              tone: settings.tone,
              docType: settings.docType,
              hierarchy: settings.hierarchy,
            },
          },
          (chunk: string) => {
            fullContent += chunk;
            setStreamingContent(fullContent);

            // Update PRD content for preview
            if (fullContent.includes("# ") || fullContent.includes("## ")) {
              setPrdContent(fullContent);
            }
          }
        );

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

        // Save chat to database
        try {
          const { chat: savedChat } = await saveChat({
            chatId: finalChat.id,
            title: finalChat.title,
            projectId: finalChat.projectId,
            settings: settings,
            messages: finalChat.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });

          console.log("Chat saved successfully:", savedChat.id);

          // Auto-save as PRD document if it looks like a PRD
          if (fullContent.length > 500 && (fullContent.includes("# ") || fullContent.includes("## "))) {
            const { document } = await saveDocument({
              title: finalChat.title,
              contentMarkdown: fullContent,
              status: "draft",
              visibility: "private",
              templateId: template?.id,
            });

            console.log("PRD document saved:", document.id);
            toast.success("PRD saved successfully");
          }
        } catch (saveError) {
          console.error("Error saving chat:", saveError);
          toast.error("Failed to save chat");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to generate response");
      } finally {
        setIsLoading(false);
      }
    },
    [currentChat, createNewChat, selectedTemplate, user]
  );

  return {
    chats,
    currentChat,
    isLoading,
    isLoadingHistory,
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
