import { Button } from "@/components/ui/button";
import { Copy, Check, FileText, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PRDOutputProps {
  content: string;
  onReset: () => void;
}

export function PRDOutput({ content, onReset }: PRDOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("PRD copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Generated PRD</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            New PRD
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-card p-6 md:p-8 overflow-auto max-h-[70vh]">
        <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-a:text-primary">
          <div
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(content),
            }}
          />
        </article>
      </div>
    </div>
  );
}

function formatMarkdown(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Bullet points
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4">$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    // Code blocks
    .replace(/`(.*?)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Paragraphs
    .replace(/\n\n/gim, '</p><p class="mb-4">')
    // Line breaks
    .replace(/\n/gim, '<br />');
}
