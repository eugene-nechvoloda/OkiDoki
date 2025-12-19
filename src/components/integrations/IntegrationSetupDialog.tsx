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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Check, AlertCircle } from "lucide-react";
import { connectIntegration, INTEGRATION_CONFIG } from "@/services/api";
import { toast } from "sonner";

interface IntegrationSetupDialogProps {
  provider: "confluence" | "linear" | "gamma" | "napkin" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IntegrationSetupDialog({
  provider,
  open,
  onOpenChange,
  onSuccess,
}: IntegrationSetupDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  const config = provider ? INTEGRATION_CONFIG[provider] : null;

  const handleConnect = async () => {
    if (!provider || !config) return;

    // Validate input
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    setIsConnecting(true);

    try {
      await connectIntegration({
        provider,
        credentials: {
          api_key: apiKey,
        },
        config: {
          scopes: [...config.scopes],
          workspace_id: workspaceId || undefined,
          workspace_name: workspaceName || undefined,
        },
      });

      toast.success(`Successfully connected to ${config.name}`);

      // Reset form
      setApiKey("");
      setWorkspaceId("");
      setWorkspaceName("");

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to connect integration:", error);
      toast.error(`Failed to connect to ${config?.name}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOAuthConnect = () => {
    if (!provider || !config) return;

    // In a real implementation, this would:
    // 1. Open OAuth popup
    // 2. Handle callback
    // 3. Exchange code for tokens
    // 4. Store tokens in database

    toast.info("OAuth flow would open here");

    // For demo purposes, we'll simulate a successful connection with a mock API key
    setTimeout(() => {
      setApiKey("demo_api_key_" + Date.now());
      setWorkspaceName(`${config.name} Workspace`);
    }, 1000);
  };

  if (!provider || !config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-6 pr-4">
            {/* OAuth Method */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Recommended: OAuth 2.0</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Securely connect your {config.name} account using OAuth. This is the
                recommended method.
              </p>
              <Button
                onClick={handleOAuthConnect}
                className="w-full gradient-brand text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect with OAuth
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or use API key
                </span>
              </div>
            </div>

            {/* API Key Method */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key">API Key *</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get your API key from{" "}
                  <a
                    href={`${config.authUrl.replace("/authorize", "/settings")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {config.name} settings
                  </a>
                </p>
              </div>

              {provider === "confluence" || provider === "linear" ? (
                <>
                  <div>
                    <Label htmlFor="workspace-id">Workspace ID (Optional)</Label>
                    <Input
                      id="workspace-id"
                      placeholder="e.g., your-workspace-id"
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="workspace-name">Workspace Name (Optional)</Label>
                    <Input
                      id="workspace-name"
                      placeholder="e.g., My Team"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </>
              ) : null}
            </div>

            {/* Scopes Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Required Permissions
              </h4>
              <ul className="space-y-1">
                {config.scopes.map((scope) => (
                  <li key={scope} className="text-sm flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <code className="text-xs bg-background px-1 py-0.5 rounded">
                      {scope}
                    </code>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting || !apiKey.trim()}
                className="gradient-brand text-primary-foreground"
              >
                {isConnecting ? "Connecting..." : "Connect Integration"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
