import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, ExternalLink, Settings, Database, Send, Bot } from "lucide-react";
import { getIntegrations, INTEGRATION_CONFIG } from "@/services/api";
import type { Integration } from "@/types/database";
import { cn } from "@/lib/utils";

interface IntegrationsQuickPanelProps {
  onClose?: () => void;
}

type IntegrationProvider = "confluence" | "linear" | "gamma" | "napkin";

export function IntegrationsQuickPanel({ onClose }: IntegrationsQuickPanelProps) {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationByProvider = (provider: IntegrationProvider) => {
    return integrations.find((i) => i.provider === provider && i.is_active);
  };

  const handleNavigateToIntegrations = () => {
    navigate("/integrations");
    onClose?.();
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
    <div className="w-80">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Integrations</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateToIntegrations}
            className="h-7 px-2 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Quick access to connected tools
        </p>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="p-3 space-y-3">
          {/* Knowledge Base Section */}
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Knowledge Base
              </span>
            </div>
            <div className="space-y-1">
              <div className="px-3 py-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                No integrations configured
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Export
              </span>
            </div>
            {loading ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="space-y-1">
                {exportIntegrations.map(({ provider, config }) => {
                  const integration = getIntegrationByProvider(provider);
                  const isConnected = !!integration;

                  return (
                    <button
                      key={provider}
                      onClick={handleNavigateToIntegrations}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        isConnected
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {config.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {isConnected ? (
                              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" />
                                Connected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <X className="h-2.5 w-2.5" />
                                Not connected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Section */}
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Model
              </span>
            </div>
            <div className="space-y-1">
              <button
                onClick={handleNavigateToIntegrations}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 text-left transition-colors"
              >
                <Bot className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    Claude Sonnet 4.5
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    Active
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <Button
          onClick={handleNavigateToIntegrations}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          <Settings className="h-3 w-3 mr-2" />
          Configure Integrations
        </Button>
      </div>
    </div>
  );
}
