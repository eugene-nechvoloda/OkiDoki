import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  Search,
  Clock,
  Eye,
  Trash2,
  MoreHorizontal,
  ArrowLeft,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocuments, saveDocument } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import type { PRDDocument } from "@/types/database";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chats, currentChat, createNewChat, selectChat } = useChat();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [documents, setDocuments] = useState<PRDDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<PRDDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [user]);

  async function loadDocuments() {
    if (!user) return;

    try {
      setLoading(true);
      const { documents: docs } = await getDocuments({ limit: 100 });
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  // Filter documents by search query
  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle opening a document for viewing/editing
  const handleOpenDocument = (doc: PRDDocument) => {
    setSelectedDoc(doc);
    setEditContent(doc.content_markdown || "");
    setIsEditing(false);
  };

  // Handle saving edited document
  const handleSaveDocument = async () => {
    if (!selectedDoc) return;

    try {
      await saveDocument({
        documentId: selectedDoc.id,
        title: selectedDoc.title,
        contentMarkdown: editContent,
        status: selectedDoc.status,
      });

      toast.success("Document saved successfully");
      setIsEditing(false);

      // Reload documents to get updated version
      await loadDocuments();

      // Update selected doc with new content
      const updatedDoc = documents.find((d) => d.id === selectedDoc.id);
      if (updatedDoc) {
        setSelectedDoc(updatedDoc);
      }
    } catch (error) {
      console.error("Failed to save document:", error);
      toast.error("Failed to save document");
    }
  };

  // Handle deleting a document
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // TODO: Implement delete endpoint
      toast.info("Delete functionality coming soon");
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    }
  };

  // Markdown components for preview
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground border-b pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="mb-4 text-foreground/90 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 text-foreground/90">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 text-foreground/90">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground">
        {children}
      </em>
    ),
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {children}
        </code>
      ) : (
        <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4 text-foreground">
          {children}
        </code>
      ),
    pre: ({ children }) => (
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-foreground/80">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChat?.id}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onNavigate={(view) => {
          if (view === "chats") navigate("/");
          if (view === "projects") navigate("/projects");
          if (view === "templates") navigate("/templates");
          if (view === "documents") navigate("/documents");
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDoc ? (
          // Document Editor View
          <div className="flex-1 flex flex-col">
            {/* Editor Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedDoc(null);
                    setIsEditing(false);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">{selectedDoc.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(selectedDoc.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(selectedDoc.content_markdown || "");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDocument}
                      className="gradient-brand text-primary-foreground"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gradient-brand text-primary-foreground"
                  >
                    Edit Document
                  </Button>
                )}
              </div>
            </div>

            {/* Editor Content */}
            <ScrollArea className="flex-1">
              <div className="max-w-4xl mx-auto px-6 py-8">
                {isEditing ? (
                  // Edit Mode - Notion-like textarea
                  <div className="min-h-[600px]">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[600px] p-4 bg-background text-foreground border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm leading-relaxed"
                      placeholder="Write your PRD content here... (Markdown supported)"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Tip: Use Markdown formatting (# for headings, ** for bold, * for italic, etc.)
                    </p>
                  </div>
                ) : (
                  // View Mode - Rendered markdown
                  <article className="prose prose-neutral dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {selectedDoc.content_markdown || "*No content*"}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Document List View
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">Projects & Documents</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage your saved PRD documents
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/")}
                  className="gradient-brand text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New PRD
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Document List */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Loading documents...</p>
                    </div>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No documents yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      {searchQuery
                        ? "No documents match your search"
                        : "Create your first PRD to get started"}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => navigate("/")}
                        className="gradient-brand text-primary-foreground"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New PRD
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="group p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => handleOpenDocument(doc)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                doc.status === "draft" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                doc.status === "final" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                doc.status === "archived" && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                              )}
                            >
                              {doc.status}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        <h3 className="font-medium mb-2 line-clamp-2">{doc.title}</h3>

                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {doc.content_markdown
                            ? doc.content_markdown.slice(0, 150) + "..."
                            : "No content"}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
