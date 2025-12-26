/**
 * MCP Client for Remote MCP Servers
 * Implements JSON-RPC 2.0 protocol for MCP communication
 */

const MCP_PROTOCOL_VERSION = "2025-06-18";

export interface MCPClientConfig {
  serverUrl: string;
  authToken: string;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    uri?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Client for calling remote MCP servers via HTTP transport
 */
export class MCPClient {
  private serverUrl: string;
  private authToken: string;
  private sessionId: string;
  private requestId: number = 0;

  constructor(config: MCPClientConfig) {
    this.serverUrl = config.serverUrl;
    this.authToken = config.authToken;
    this.sessionId = crypto.randomUUID();
  }

  /**
   * Initialize connection to MCP server
   */
  async initialize(): Promise<void> {
    const response = await this.sendRequest("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        sampling: {},
      },
      clientInfo: {
        name: "okidoki",
        version: "1.0.0",
      },
    });

    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    console.log("MCP initialized:", response.result);
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest("tools/list", {});

    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return response.result?.tools || [];
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const response = await this.sendRequest("tools/call", {
      name: toolCall.name,
      arguments: toolCall.arguments,
    });

    if (response.error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${response.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return response.result;
  }

  /**
   * Send JSON-RPC request to MCP server
   */
  private async sendRequest(
    method: string,
    params: any
  ): Promise<{ result?: any; error?: { code: number; message: string } }> {
    this.requestId++;

    const request = {
      jsonrpc: "2.0",
      id: this.requestId,
      method,
      params,
    };

    try {
      const response = await fetch(this.serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${this.authToken}`,
          "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
          "X-Session-ID": this.sessionId,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error("MCP request failed:", error);
      return {
        error: {
          code: -1,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Close the MCP connection
   */
  async close(): Promise<void> {
    // Send close notification (no response expected)
    await this.sendRequest("close", {});
  }
}

/**
 * Create and initialize an MCP client
 */
export async function createMCPClient(
  config: MCPClientConfig
): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.initialize();
  return client;
}
