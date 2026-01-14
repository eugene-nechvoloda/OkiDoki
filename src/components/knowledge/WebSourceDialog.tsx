import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { addKnowledgeWebSource } from "@/services/knowledgeBase";

interface WebSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WebSourceDialog({
  open,
  onOpenChange,
  onSuccess,
}: WebSourceDialogProps) {
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setUrlError(null);
      return false;
    }

    try {
      const urlObj = new URL(value);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        setUrlError("URL must start with http:// or https://");
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError("Please enter a valid URL");
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    validateUrl(value);
  };

  const handleAdd = async () => {
    if (!validateUrl(url)) {
      return;
    }

    setIsAdding(true);

    try {
      await addKnowledgeWebSource(url);
      toast.success("Web source added successfully");
      setUrl("");
      setUrlError(null);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add web source:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add web source"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !urlError && url.trim() && !isAdding) {
      handleAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Add Web Source
          </DialogTitle>
          <DialogDescription>
            Add a URL to crawl for context. The content will be fetched and added to your knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="url">Website URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/documentation"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`mt-1.5 ${urlError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {urlError && (
              <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </div>
            )}
          </div>

          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1">Supported Content:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Documentation pages</li>
              <li>Blog posts and articles</li>
              <li>Product pages</li>
              <li>Technical specifications</li>
            </ul>
          </div>

          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Some websites may block automated content fetching.
              If a URL fails to load, try accessing the content directly or using a different source.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!url.trim() || !!urlError || isAdding}
              className="gradient-brand text-primary-foreground"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Source"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
