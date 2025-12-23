import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
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
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import { toast } from "sonner";
import {
  getIntegrations,
  disconnectIntegration,
  INTEGRATION_CONFIG,
} from "@/services/api";
import type { Integration } from "@/types/database";
import { IntegrationSetupDialog } from "@/components/integrations/IntegrationSetupDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type IntegrationProvider = "confluence" | "linear" | "gamma" | "napkin";

export default function Integrations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chats, currentChat, createNewChat, selectChat } = useChat();

  
  const [activeTab, setActiveTab] = useState("knowledge");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupProvider, setSetupProvider] = useState<IntegrationProvider | null>(
    null
  );
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const { integrations: data } = await getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error("Failed to load integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: IntegrationProvider) => {
    setSetupProvider(provider);
    setShowSetupDialog(true);
  };

  const handleDisconnect = async (integrationId: string, providerName: string) => {
    try {
      await disconnectIntegration(integrationId);
      toast.success(`Disconnected from ${providerName}`);
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to disconnect integration:", error);
      toast.error(`Failed to disconnect from ${providerName}`);
    }
  };

  const handleReconnect = (provider: IntegrationProvider) => {
    handleConnect(provider);
  };

  const toggleExpanded = (integrationId: string) => {
    const newExpanded = new Set(expandedIntegrations);
    if (newExpanded.has(integrationId)) {
      newExpanded.delete(integrationId);
    } else {
      newExpanded.add(integrationId);
    }
    setExpandedIntegrations(newExpanded);
  };

  const getIntegrationByProvider = (provider: IntegrationProvider) => {
    return integrations.find((i) => i.provider === provider && i.status === 'connected');
  };

  const exportIntegrations: Array<{
    provider: IntegrationProvider;
    config: typeof INTEGRATION_CONFIG[IntegrationProvider];
  }> = [
    { provider: "confluence", config: INTEGRATION_CONFIG.confluence },
    { provider: "linear", config: INTEGRATION_CONFIG.linear },
    { provider: "gamma", config: INTEGRATION_CONFIG.gamma },
    { provider: "napkin", config: INTEGRATION_CONFIG.napkin },
  ];

  return (
    <MainLayout
      chats={chats}
      currentChatId={currentChat?.id}
      onNewChat={createNewChat}
      onSelectChat={selectChat}
    >
      <div className="h-full flex flex-col overflow-hidden">
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
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
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
                      Connect your knowledge sources to enhance PRD generation with
                      context-aware information.
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
                    <h2 className="text-lg font-semibold mb-2">
                      Export Integrations
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Connect platforms to export your PRDs directly from OkiDoki.
                    </p>

                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading integrations...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                        {exportIntegrations.map(({ provider, config }) => {
                          const integration = getIntegrationByProvider(provider);
                          const isConnected = !!integration;
                          const isExpanded = integration
                            ? expandedIntegrations.has(integration.id)
                            : false;

                          return (
                            <div
                              key={provider}
                              className={cn(
                                "p-5 bg-card border border-border rounded-lg transition-all",
                                isConnected && "ring-2 ring-primary/20"
                              )}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                                    {config.icon}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold flex items-center gap-2">
                                      {config.name}
                                      {isConnected && (
                                        <Check className="h-4 w-4 text-green-500" />
                                      )}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                      {config.description}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {isConnected && integration ? (
                                <div className="space-y-3">
                                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Connected
                                  </div>

                                  {/* Collapsible Details */}
                                  <Collapsible
                                    open={isExpanded}
                                    onOpenChange={() =>
                                      toggleExpanded(integration.id)
                                    }
                                  >
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between text-xs"
                                      >
                                        <span>View Details</span>
                                        {isExpanded ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 mt-2">
                                      {(integration.config_json as Record<string, unknown>)?.workspace_name && (
                                        <div className="text-xs">
                                          <span className="text-muted-foreground">
                                            Workspace:{" "}
                                          </span>
                                          <span className="font-medium">
                                            {(integration.config_json as Record<string, unknown>).workspace_name as string}
                                          </span>
                                        </div>
                                      )}

                                      <div className="text-xs">
                                        <span className="text-muted-foreground">
                                          Scopes:{" "}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                          {config.scopes.map((scope) => (
                                            <div
                                              key={scope}
                                              className="flex items-center gap-1"
                                            >
                                              <Check className="h-2.5 w-2.5 text-green-500" />
                                              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                                                {scope}
                                              </code>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="text-xs text-muted-foreground">
                                        Connected{" "}
                                        {new Date(
                                          integration.created_at
                                        ).toLocaleDateString()}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() =>
                                        handleDisconnect(
                                          integration.id,
                                          config.name
                                        )
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Disconnect
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReconnect(provider)}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Reconnect
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="w-full gradient-brand text-primary-foreground"
                                  onClick={() => handleConnect(provider)}
                                >
                                  <Plug className="h-3 w-3 mr-2" />
                                  Connect
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                            <Label className="text-base font-semibold">
                              Current Model
                            </Label>
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

        {/* Integration Setup Dialog */}
        <IntegrationSetupDialog
          provider={setupProvider}
          open={showSetupDialog}
          onOpenChange={setShowSetupDialog}
          onSuccess={loadIntegrations}
        />
      </div>
    </MainLayout>
  );
}
