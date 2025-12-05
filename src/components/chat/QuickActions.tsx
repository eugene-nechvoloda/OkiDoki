import { FileText, Sparkles, Lightbulb, MessageSquare } from "lucide-react";
import type { QuickActionType } from "@/types";

interface QuickActionsProps {
  onSelect: (type: QuickActionType) => void;
}

const actions = [
  {
    type: "write" as QuickActionType,
    label: "Help me write a document",
    icon: FileText,
  },
  {
    type: "improve" as QuickActionType,
    label: "Improve my document",
    icon: Sparkles,
  },
  {
    type: "brainstorm" as QuickActionType,
    label: "Brainstorm new ideas",
    icon: Lightbulb,
  },
  {
    type: "feedback" as QuickActionType,
    label: "Get feedback",
    icon: MessageSquare,
  },
];

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {actions.map((action) => (
        <button
          key={action.type}
          onClick={() => onSelect(action.type)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <action.icon className="h-3.5 w-3.5" />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
