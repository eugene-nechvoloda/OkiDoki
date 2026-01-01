import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Message, Chat, PRDTemplate, ChatSettings } from "@/types";
import { BUILT_IN_TEMPLATES } from "@/data/templates";
import { saveChat, getChats, getChat, saveDocument, generatePRD } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";

const SELECTED_TEMPLATE_STORAGE_KEY = "okidoki.selectedTemplate";

export function useChat() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PRDTemplate | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SELECTED_TEMPLATE_STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as unknown;
      if (!parsed) return null;

      const t = parsed as Partial<PRDTemplate>;
      if (typeof t.id !== "string" || typeof t.name !== "string") return null;

      return {
        id: t.id,
        name: t.name,
        description: typeof t.description === "string" ? t.description : "",
        sections: Array.isArray(t.sections) ? (t.sections as string[]) : [],
        isBuiltIn: !!t.isBuiltIn,
        icon: typeof t.icon === "string" ? t.icon : undefined,
      };
    } catch {
      return null;
    }
  });
  const [prdContent, setPrdContent] = useState("");
  
  // Track previous PRD content for revert functionality
  const previousPrdContentRef = useRef<string>("");
  const [canRevert, setCanRevert] = useState(false);

  // TEMPORARY: Debug logging
  useEffect(() => {
    console.log('🔍 useChat - User state changed:', user);
    console.log('🔍 useChat - User ID:', user?.id);
    console.log('🔍 useChat - User is null?', !user);
  }, [user]);

  // Persist selected template (including null for Auto)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SELECTED_TEMPLATE_STORAGE_KEY,
        JSON.stringify(selectedTemplate)
      );
    } catch {
      // ignore
    }
  }, [selectedTemplate]);

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

  const selectChat = useCallback(async (chatId: string) => {
    try {
      // Fetch full chat with messages from the API
      const { chat: fullChat, messages } = await getChat(chatId);
      
      // Convert to app format with messages
      const chatWithMessages: Chat = {
        id: fullChat.id,
        title: fullChat.title || "Untitled Chat",
        messages: messages.map((m: any) => ({
          id: m.id || crypto.randomUUID(),
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        })),
        createdAt: new Date(fullChat.created_at),
        updatedAt: new Date(fullChat.updated_at),
      };
      
      setCurrentChat(chatWithMessages);
      
      // Also update the chats list with the full data
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? chatWithMessages : c))
      );
      
      // If chat has assistant messages, show the last PRD content
      const lastAssistant = chatWithMessages.messages
        .filter((m) => m.role === "assistant")
        .pop();
      if (lastAssistant?.content) {
        setPrdContent(lastAssistant.content);
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
      toast.error("Failed to load chat");
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, settings: ChatSettings, files?: File[]) => {
      console.log('📨 sendMessage called with files:', files?.length || 0);
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
         ? BUILT_IN_TEMPLATES.find((t) => t.id === settings.templateId) ||
           selectedTemplate ||
           null
         : null;

      try {
        // Convert files to base64 for the API
        let attachments: Array<{ type: 'image'; name: string; mimeType: string; base64: string }> = [];
        if (files && files.length > 0) {
          attachments = await Promise.all(
            files.map(async (file) => {
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  // Extract base64 data without the data URL prefix
                  const base64Data = result.split(',')[1];
                  resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              return {
                type: 'image' as const,
                name: file.name,
                mimeType: file.type,
                base64,
              };
            })
          );
        }

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
            attachments: attachments.length > 0 ? attachments : undefined,
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
        
        // Save previous content for revert and update current
        if (prdContent && prdContent !== fullContent) {
          previousPrdContentRef.current = prdContent;
          setCanRevert(true);
        }
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

  // Revert to previous PRD content
  const revertPrdContent = useCallback(() => {
    if (previousPrdContentRef.current) {
      const current = prdContent;
      setPrdContent(previousPrdContentRef.current);
      previousPrdContentRef.current = current; // Allow toggling back
      toast.success("Reverted to previous version");
    }
  }, [prdContent]);

  return {
    chats,
    currentChat,
    isLoading,
    isLoadingHistory,
    streamingContent,
    selectedTemplate,
    prdContent,
    canRevert,
    setSelectedTemplate,
    createNewChat,
    selectChat,
    sendMessage,
    setPrdContent,
    revertPrdContent,
  };
}
