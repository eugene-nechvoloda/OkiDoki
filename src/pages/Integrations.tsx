import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plug,
  Database,
  Send,
  Bot,
  Check,
  Settings,
  ExternalLink,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import { toast } from "sonner";

export default function Integrations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chats, currentChat, createNewChat, selectChat } = useChat();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("knowledge");

  // Export integrations state
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  const exportIntegrations = [
    {
      id: "confluence",
      name: "Confluence",
      description: "Export PRDs to Confluence pages",
      icon: "📄",
      connected: connectedIntegrations.includes("confluence"),
    },
    {
      id: "linear",
      name: "Linear",
      description: "Create Linear issues from PRDs",
      icon: "🔷",
      connected: connectedIntegrations.includes("linear"),
    },
    {
      id: "gamma",
      name: "Gamma",
      description: "Generate presentations from PRDs",
      icon: "🎨",
      connected: connectedIntegrations.includes("gamma"),
    },
    {
      id: "napkin",
      name: "Napkin AI",
      description: "Create visual diagrams from PRDs",
      icon: "✏️",
      connected: connectedIntegrations.includes("napkin"),
    },
  ];

  const handleConnectIntegration = (integrationId: string) => {
    toast.info(`${integrationId} integration coming soon`);
    // TODO: Implement OAuth flow
  };

  const handleDisconnectIntegration = (integrationId: string) => {
    setConnectedIntegrations((prev) => prev.filter((id) => id !== integrationId));
    toast.success(`Disconnected from ${integrationId}`);
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
          if (view === "integrations") navigate("/integrations");
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Integrations</h1>
              <p className="text-sm text-muted-foreground">
                Connect your tools and customize your PRD workflow
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="knowledge" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Knowledge Base
                </TabsTrigger>
                <TabsTrigger value="export" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Export
                </TabsTrigger>
                <TabsTrigger value="model" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Model
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {/* Knowledge Base Tab */}
                <TabsContent value="knowledge" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Knowledge Base</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Connect your knowledge sources to enhance PRD generation with context-aware
                      information.
                    </p>

                    <div className="space-y-4">
                      {/* Upload Documents */}
                      <div className="p-5 bg-card border border-border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-xl">📚</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">Document Library</h3>
                              <p className="text-sm text-muted-foreground">
                                Upload files to use as context
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          0 documents uploaded
                        </div>
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
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add URL
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          No web sources added
                        </div>
                      </div>

                      {/* API Connections */}
                      <div className="p-5 bg-card border border-border rounded-lg opacity-60">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-xl">🔌</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">API Connections</h3>
                              <p className="text-sm text-muted-foreground">
                                Connect external APIs
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
                </TabsContent>

                {/* Export Tab */}
                <TabsContent value="export" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Export Integrations</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Connect platforms to export your PRDs directly from OkiDoki.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exportIntegrations.map((integration) => (
                        <div
                          key={integration.id}
                          className={cn(
                            "p-5 bg-card border border-border rounded-lg transition-all",
                            integration.connected && "ring-2 ring-primary/20"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                                {integration.icon}
                              </div>
                              <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                  {integration.name}
                                  {integration.connected && (
                                    <Check className="h-4 w-4 text-green-500" />
                                  )}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {integration.description}
                                </p>
                              </div>
                            </div>
                          </div>

                          {integration.connected ? (
                            <div className="space-y-2">
                              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Connected
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleDisconnectIntegration(integration.id)}
                                >
                                  Disconnect
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleConnectIntegration(integration.id)}
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Model Tab */}
                <TabsContent value="model" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">AI Model Settings</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure the AI model powering your PRD generation.
                    </p>

                    <div className="space-y-6">
                      {/* Current Model */}
                      <div className="p-5 bg-card border border-border rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <Label className="text-base font-semibold">Current Model</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              The AI model used for PRD generation
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                          <Bot className="h-8 w-8 text-primary" />
                          <div>
                            <div className="font-semibold">Claude Sonnet 4.5</div>
                            <div className="text-sm text-muted-foreground">
                              Anthropic's latest model (claude-sonnet-4-5-20250929)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Model Parameters */}
                      <div className="p-5 bg-card border border-border rounded-lg space-y-4">
                        <div>
                          <Label htmlFor="temperature" className="text-base font-semibold">
                            Temperature
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1 mb-3">
                            Controls randomness in responses (0 = focused, 1 = creative)
                          </p>
                          <Input
                            id="temperature"
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            defaultValue="0.7"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <Label htmlFor="max-tokens" className="text-base font-semibold">
                            Max Tokens
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1 mb-3">
                            Maximum length of generated PRDs
                          </p>
                          <Input
                            id="max-tokens"
                            type="number"
                            min="1000"
                            max="8192"
                            step="100"
                            defaultValue="8192"
                            className="w-full"
                          />
                        </div>

                        <Button className="w-full gradient-brand text-primary-foreground">
                          Save Settings
                        </Button>
                      </div>

                      {/* API Key Management */}
                      <div className="p-5 bg-card border border-border rounded-lg">
                        <Label className="text-base font-semibold">API Key</Label>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          Your Anthropic API key is configured server-side
                        </p>
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          <span>API key configured</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
