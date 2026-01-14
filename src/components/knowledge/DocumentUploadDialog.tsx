import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, File, FileText, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { uploadKnowledgeDocument } from "@/services/knowledgeBase";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: DocumentUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = [
        "application/pdf",
        "text/csv",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];

      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Unsupported file type`);
        return false;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name}: File too large (max 10MB)`);
        return false;
      }

      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    const progress: Record<string, "pending" | "uploading" | "done" | "error"> = {};
    selectedFiles.forEach((file) => {
      progress[file.name] = "pending";
    });
    setUploadProgress(progress);

    for (const file of selectedFiles) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: "uploading" }));

        await uploadKnowledgeDocument(file);

        setUploadProgress((prev) => ({ ...prev, [file.name]: "done" }));
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
        setUploadProgress((prev) => ({ ...prev, [file.name]: "error" }));
      }
    }

    const successCount = Object.values(uploadProgress).filter((s) => s === "done").length;

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document(s)`);
      onSuccess();
    }

    setUploading(false);
    setSelectedFiles([]);
    setUploadProgress({});
    onOpenChange(false);
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return "📄";
    } else if (file.type.includes("word")) {
      return "📝";
    } else if (file.type === "text/csv") {
      return "📊";
    } else {
      return "📃";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Documents to Knowledge Base</DialogTitle>
          <DialogDescription>
            Upload PDF, Word, or CSV files to use as context for PRD generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File selection area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to browse or drag and drop files here
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, Word (.docx, .doc), CSV, TXT • Max 10MB per file
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{getFileIcon(file)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      {uploading ? (
                        <div className="ml-2">
                          {uploadProgress[file.name] === "uploading" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {uploadProgress[file.name] === "done" && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                          {uploadProgress[file.name] === "error" && (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="gradient-brand text-primary-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
