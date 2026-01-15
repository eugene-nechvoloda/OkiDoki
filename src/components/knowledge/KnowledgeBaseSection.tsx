import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Globe,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  getKnowledgeDocuments,
  getKnowledgeWebSources,
  deleteKnowledgeDocument,
  deleteKnowledgeWebSource,
  refreshWebSource,
  type KnowledgeDocument,
  type KnowledgeWebSource,
} from "@/services/knowledgeBase";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import { WebSourceDialog } from "./WebSourceDialog";

export function KnowledgeBaseSection() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [webSources, setWebSources] = useState<KnowledgeWebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showWebSourceDialog, setShowWebSourceDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const [docs, sources] = await Promise.all([
        getKnowledgeDocuments(),
        getKnowledgeWebSources(),
      ]);
      setDocuments(docs);
      setWebSources(sources);
    } catch (error) {
      console.error("Failed to load knowledge base:", error);
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteKnowledgeDocument(id);
      toast.success("Document deleted");
      await loadKnowledgeBase();
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteWebSource = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteKnowledgeWebSource(id);
      toast.success("Web source deleted");
      await loadKnowledgeBase();
    } catch (error) {
      toast.error("Failed to delete web source");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefreshWebSource = async (id: string) => {
    setRefreshingId(id);
    try {
      await refreshWebSource(id);
      toast.success("Web source refreshed");
      await loadKnowledgeBase();
    } catch (error) {
      toast.error("Failed to refresh web source");
    } finally {
      setRefreshingId(null);
    }
  };

  const getFileIcon = (fileType: string | undefined) => {
    const type = (fileType || "").toLowerCase();
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("csv")) return "📊";
    return "📃";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your knowledge sources to enhance PRD generation with context-aware information.
        </p>

        <div className="space-y-4">
          {/* Document Library */}
          <div className="p-5 bg-card border border-border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">📚</span>
                </div>
                <div>
                  <h3 className="font-semibold">Document Library</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload PDF, Word, or CSV files to use as context
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDocumentDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No documents uploaded yet
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2 mt-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl">{getFileIcon(doc.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(doc.file_size / 1024).toFixed(1)} KB •{" "}
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingId === doc.id}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {documents.length > 0 && (
              <div className="text-xs text-muted-foreground mt-3">
                {documents.length} document(s) in knowledge base
              </div>
            )}
          </div>

          {/* Web Sources */}
          <div className="p-5 bg-card border border-border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">🌐</span>
                </div>
                <div>
                  <h3 className="font-semibold">Web Sources</h3>
                  <p className="text-sm text-muted-foreground">
                    Add URLs to crawl for context
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWebSourceDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add URL
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : webSources.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No web sources added yet
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2 mt-3">
                  {webSources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{source.title}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                          >
                            {source.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-xs text-muted-foreground">
                            Last crawled: {new Date(source.last_crawled_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRefreshWebSource(source.id)}
                          disabled={refreshingId === source.id}
                        >
                          {refreshingId === source.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteWebSource(source.id)}
                          disabled={deletingId === source.id}
                        >
                          {deletingId === source.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {webSources.length > 0 && (
              <div className="text-xs text-muted-foreground mt-3">
                {webSources.length} web source(s) in knowledge base
              </div>
            )}
          </div>

          {/* API Connections - Coming Soon */}
          <div className="p-5 bg-card border border-border rounded-lg opacity-60">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">🔌</span>
                </div>
                <div>
                  <h3 className="font-semibold">API Connections</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect external APIs for real-time data
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <DocumentUploadDialog
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}
        onSuccess={loadKnowledgeBase}
      />
      <WebSourceDialog
        open={showWebSourceDialog}
        onOpenChange={setShowWebSourceDialog}
        onSuccess={loadKnowledgeBase}
      />
    </div>
  );
}
