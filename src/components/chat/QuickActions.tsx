import { ChevronRight } from "lucide-react";
import { QUICK_ACTIONS } from "@/data/templates";
import { cn } from "@/lib/utils";
import type { QuickActionType } from "@/types";

interface QuickActionsProps {
  onSelect: (type: QuickActionType) => void;
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="space-y-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.type}
          onClick={() => onSelect(action.type)}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left group",
            action.isPro && "opacity-75"
          )}
        >
          <span className="text-2xl">{action.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{action.title}</h3>
              {action.isPro && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                  Pro
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      ))}
    </div>
  );
}
