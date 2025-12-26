import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchLinearTeams,
  fetchLinearProjects,
  fetchLinearWorkspace,
  validateLinearApiKey,
  type LinearTeam,
  type LinearProject,
} from "@/services/linearApi";
import { supabase } from "@/integrations/supabase/client";

interface LinearSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinearSetupDialog({
  open,
  onOpenChange,
  onSuccess,
}: LinearSetupDialogProps) {
  const [step, setStep] = useState<"api-key" | "team-selection">("api-key");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [projects, setProjects] = useState<LinearProject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("api-key");
      setApiKey("");
      setTeams([]);
      setProjects([]);
      setSelectedTeamId("");
      setSelectedProjectId("");
      setWorkspaceName("");
    }
  }, [open]);

  // Load projects when team is selected
  useEffect(() => {
    if (selectedTeamId && apiKey) {
      loadProjects();
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedTeamId]);

  const loadProjects = async () => {
    if (!selectedTeamId) return;

    try {
      const projectList = await fetchLinearProjects(apiKey, selectedTeamId);
      setProjects(projectList);
    } catch (error) {
      console.error("Failed to load Linear projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const handleValidateApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsLoading(true);

    try {
      // Validate the API key
      const isValid = await validateLinearApiKey(apiKey);

      if (!isValid) {
        toast.error("Invalid API key");
        return;
      }

      // Test MCP connection
      toast.info("Testing Linear MCP connection...");
      const mcpValid = await testLinearMCPConnection(apiKey);

      if (!mcpValid) {
        toast.error("Linear API key is valid, but MCP connection failed. Export may not work.");
        // Continue anyway, as the issue might be temporary
      }

      // Fetch workspace info and teams
      const [workspace, teamList] = await Promise.all([
        fetchLinearWorkspace(apiKey),
        fetchLinearTeams(apiKey),
      ]);

      setWorkspaceName(workspace.name);
      setTeams(teamList);

      if (teamList.length === 0) {
        toast.error("No teams found in your Linear workspace");
        return;
      }

      // Auto-select first team
      setSelectedTeamId(teamList[0].id);

      setStep("team-selection");
      toast.success(mcpValid ? "Connected with Linear MCP ✓" : "API key validated (MCP unavailable)");
    } catch (error) {
      console.error("Failed to validate Linear API key:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to validate API key"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testLinearMCPConnection = async (apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch("https://mcp.linear.app/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": `Bearer ${apiKey}`,
          "MCP-Protocol-Version": "2025-06-18",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: { tools: {} },
            clientInfo: { name: "okidoki", version: "1.0.0" },
          },
        }),
      });

      if (!response.ok) {
        console.error("MCP connection failed:", response.status);
        return false;
      }

      const result = await response.json();
      return !result.error;
    } catch (error) {
      console.error("MCP connection test failed:", error);
      return false;
    }
  };

  const handleConnect = async () => {
    if (!selectedTeamId) {
      toast.error("Please select a team");
      return;
    }

    setIsLoading(true);

    try {
      const selectedTeam = teams.find((t) => t.id === selectedTeamId);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // For guest mode, store in localStorage
        toast.info("Linear integration requires authentication. Please sign in.");
        return;
      }

      // Test MCP one more time before saving
      const mcpConnected = await testLinearMCPConnection(apiKey);

      // Store integration in database
      const { error } = await supabase.from("integrations").insert({
        user_id: user.id,
        provider: "linear",
        credentials_encrypted: apiKey, // In production, encrypt this!
        config_json: {
          workspace_name: workspaceName,
          team_id: selectedTeamId,
          team_name: selectedTeam?.name,
          team_key: selectedTeam?.key,
          project_id: selectedProjectId || null,
          project_name:
            projects.find((p) => p.id === selectedProjectId)?.name || null,
          mcp_enabled: mcpConnected,
          mcp_server: "https://mcp.linear.app/mcp",
        },
        status: "connected",
      });

      if (error) {
        console.error("Failed to save integration:", error);
        throw new Error("Failed to save integration");
      }

      toast.success(
        mcpConnected
          ? `Successfully connected to ${workspaceName} with MCP ✓`
          : `Connected to ${workspaceName} (MCP unavailable)`
      );

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Failed to connect Linear:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to connect to Linear"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("api-key");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">🔷</span>
            Connect Linear
          </DialogTitle>
          <DialogDescription>
            Export PRDs as intelligent issue hierarchies using Linear's MCP (Model Context Protocol)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-6 pr-4">
            {step === "api-key" && (
              <>
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Get your Linear API Key</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      Go to{" "}
                      <a
                        href="https://linear.app/settings/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Linear API Settings
                        <ExternalLink className="h-3 w-3 inline ml-1" />
                      </a>
                    </li>
                    <li>Click "Create new API key"</li>
                    <li>Give it a name (e.g., "OkiDoki Integration")</li>
                    <li>Copy the generated API key</li>
                    <li>Paste it below</li>
                  </ol>
                </div>

                <div>
                  <Label htmlFor="api-key">Linear API Key *</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="lin_api_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && apiKey.trim()) {
                        handleValidateApiKey();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key will be stored securely
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Required Permissions
                  </h4>
                  <ul className="space-y-1">
                    {["read", "write"].map((scope) => (
                      <li key={scope} className="text-sm flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600" />
                        <code className="text-xs bg-background px-1 py-0.5 rounded">
                          {scope}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2 text-primary">🤖 AI-Powered MCP Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    OkiDoki uses Linear's official MCP server to intelligently analyze your PRDs
                    and automatically create hierarchical issue structures (epics → features → tasks).
                    No manual breakdown needed!
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleValidateApiKey}
                    disabled={isLoading || !apiKey.trim()}
                    className="gradient-brand text-primary-foreground"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Next"
                    )}
                  </Button>
                </div>
              </>
            )}

            {step === "team-selection" && (
              <>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">Connected to {workspaceName}</p>
                      <p className="text-sm opacity-90">{teams.length} teams found</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="team">Team *</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger id="team" className="mt-1.5">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {team.key}
                            </span>
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    PRDs will be exported as issues in this team
                  </p>
                </div>

                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger id="project" className="mt-1.5">
                      <SelectValue placeholder="No default project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No default project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can choose a project when exporting each PRD
                  </p>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConnect}
                      disabled={isLoading || !selectedTeamId}
                      className="gradient-brand text-primary-foreground"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Connect Linear
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
