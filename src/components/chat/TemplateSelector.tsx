import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, FileText } from "lucide-react";
import { BUILT_IN_TEMPLATES } from "@/data/templates";
import type { PRDTemplate } from "@/types";

interface TemplateSelectorProps {
  selectedTemplate?: PRDTemplate;
  onSelect: (template: PRDTemplate) => void;
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-muted-foreground hover:text-foreground"
        >
          <FileText className="h-4 w-4" />
          <span className="text-sm">
            {selectedTemplate?.name || "Okidoki: PRD"}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Okidoki Templates
        </DropdownMenuLabel>
        {BUILT_IN_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => {
              onSelect(template);
              setOpen(false);
            }}
            className="flex items-start gap-3 py-2 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {selectedTemplate?.id === template.id && (
                  <Check className="h-3 w-3 text-primary" />
                )}
                <span className="font-medium">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {template.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-primary">
          + Create custom template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
