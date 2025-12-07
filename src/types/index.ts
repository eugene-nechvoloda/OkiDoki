export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  projectId?: string;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PRDTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  isBuiltIn: boolean;
}

export interface Project {
  id: string;
  name: string;
  visibility: "private" | "public";
  createdAt: Date;
}

export interface PRDDocument {
  id: string;
  title: string;
  content: string;
  projectId?: string;
  templateId?: string;
  status: "draft" | "final";
  createdAt: Date;
  updatedAt: Date;
}

export type QuickActionType = "write" | "improve" | "brainstorm" | "feedback";

export interface QuickAction {
  type: QuickActionType;
  icon: string;
  title: string;
  description: string;
  isPro?: boolean;
}

export interface ChatSettings {
  tone: string;
  docType: string;
  hierarchy: string;
  templateId: string | null;
}
