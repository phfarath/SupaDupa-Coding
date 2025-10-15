/**
 * sdMCPClient - Model Context Protocol client with WebSocket support
 * Implements full MCP specification for server communication
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  MCPMessage,
  MCPServerConfig,
  MCPClientConfig,
  MCPConnectionInfo,
  MCPToolCall,
  MCPToolResult,
  MCPClientInfo,
  MCPServerCapabilities,
  MCPInitializeParams,
  MCP_PROTOCOL,
  MCP_EVENTS,
  MCPEventType,
  MCPMethod,
  MCPToolName,
  MCPStatistics
} from '../../shared/contracts/mcp-protocol';

export class sdMCPClient extends EventEmitter {
  private config: MCPClientConfig;
  private servers: Map<string, MCPServerConfig> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private connectionInfo: Map<string, MCPConnectionInfo> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
    timestamp: number;
  }> = new Map();
  private messageId: number = 0;
  private reconnectAttempts: Map<string, number> = new Map();
  private statistics: MCPStatistics = {
    messagesSent: 0,
    messagesReceived: 0,
    toolsExecuted: 0,
    errorsEncountered: 0,
    uptime: 0,
    averageResponseTime: 0,
    serverConnections: 0,
  };
  private startTime: number = Date.now();

  constructor(config: MCPClientConfig) {
    super();
    this.config = {
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      messageTimeout: config.messageTimeout || 30000,
      enableCompression: config.enableCompression || false,
      enableEncryption: config.enableEncryption || false,
      servers: config.servers || [],
    };

    // Register initial servers
    for (const serverConfig of this.config.servers) {
      this.registerServer(serverConfig.name, serverConfig);
    }
  }

  /**
   * Register an MCP server
   */
  registerServer(name: string, serverConfig: MCPServerConfig): void {
    this.servers.set(name, {
      name,
      enabled: serverConfig.enabled !== false,
      endpoint: serverConfig.endpoint,
      tools: serverConfig.tools || [],
      capabilities: serverConfig.capabilities || [],
      permissions: serverConfig.permissions || [],
      maxConnections: serverConfig.maxConnections || 1,
      timeout: serverConfig.timeout || 30000,
      retryAttempts: serverConfig.retryAttempts || 3,
    });

    this.emit('server-registered', { name, config: serverConfig });
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverName: string): Promise<MCPConnectionInfo> {
    const server = this.servers.get(serverName);
    
    if (!server) {
      throw new Error(`MCP server not found: ${serverName}`);
    }

    if (!server.enabled) {
      throw new Error(`MCP server disabled: ${serverName}`);
    }

    if (this.connections.has(serverName)) {
      const existingInfo = this.connectionInfo.get(serverName);
      if (existingInfo?.connected) {
        return existingInfo;
      }
    }

    try {
      const ws = new WebSocket(server.endpoint);
      const connectionInfo: MCPConnectionInfo = {
        serverName,
        endpoint: server.endpoint,
        connected: false,
        toolsAvailable: [],
        capabilities: [],
      };

      this.connections.set(serverName, ws);
      this.connectionInfo.set(serverName, connectionInfo);

      // Set up WebSocket handlers
      ws.on('open', () => this.handleConnectionOpen(serverName, ws));
      ws.on('message', (data) => this.handleMessage(serverName, data));
      ws.on('close', () => this.handleConnectionClose(serverName));
      ws.on('error', (error) => this.handleConnectionError(serverName, error));

      // Wait for connection and handshake
      await this.waitForConnection(serverName);
      await this.performHandshake(serverName);
      await this.discoverTools(serverName);

      connectionInfo.connected = true;
      connectionInfo.connectedAt = new Date().toISOString();
      connectionInfo.lastHeartbeat = new Date().toISOString();

      this.statistics.serverConnections++;
      this.emit(MCP_EVENTS.SERVER_CONNECTED, { serverName, connectionInfo });

      return connectionInfo;
    } catch (error) {
      this.statistics.errorsEncountered++;
      this.emit(MCP_EVENTS.SERVER_ERROR, { serverName, error });
      throw new Error(`Failed to connect to MCP server ${serverName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<boolean> {
    const ws = this.connections.get(serverName);
    const connectionInfo = this.connectionInfo.get(serverName);

    if (!ws) {
      return false;
    }

    try {
      // Send close message if still connected
      if (ws.readyState === WebSocket.OPEN) {
        await this.sendMessage(serverName, {
          id: this.generateMessageId(),
          method: 'close',
          jsonrpc: '2.0',
        });
      }

      ws.close();
      this.connections.delete(serverName);
      this.connectionInfo.delete(serverName);
      this.reconnectAttempts.delete(serverName);

      if (this.statistics.serverConnections > 0) {
        this.statistics.serverConnections--;
      }

      this.emit(MCP_EVENTS.SERVER_DISCONNECTED, { serverName });
      return true;
    } catch (error) {
      console.error(`Error disconnecting from ${serverName}:`, error);
      return false;
    }
  }

  /**
   * Execute a tool via MCP server
   */
  async executeTool(serverName: string, toolName: string, parameters: Record<string, any> = {}, timeout?: number): Promise<MCPToolResult> {
    const connectionInfo = this.connectionInfo.get(serverName);
    
    if (!connectionInfo?.connected) {
      throw new Error(`Server not connected: ${serverName}`);
    }

    const toolCall: MCPToolCall = {
      id: this.generateMessageId(),
      serverName,
      toolName,
      parameters,
      timestamp: new Date().toISOString(),
      timeout: timeout || this.config.messageTimeout,
    };

    const startTime = Date.now();

    try {
      this.emit('tool-execution-started', toolCall);

      const result = await this.sendMessageAndWaitForResponse(serverName, {
        id: toolCall.id,
        method: MCP_PROTOCOL.METHODS.TOOLS_CALL,
        params: {
          name: toolName,
          arguments: parameters,
        },
        jsonrpc: '2.0',
      }, toolCall.timeout);

      const executionTime = Date.now() - startTime;
      this.statistics.toolsExecuted++;
      this.updateAverageResponseTime(executionTime);

      const toolResult: MCPToolResult = {
        id: toolCall.id,
        success: !result.error,
        result: result.result,
        error: result.error,
        executionTime,
        timestamp: new Date().toISOString(),
        serverName,
        toolName,
      };

      if (toolResult.success) {
        this.emit(MCP_EVENTS.TOOL_EXECUTED, toolResult);
      } else {
        this.emit(MCP_EVENTS.TOOL_FAILED, toolResult);
      }

      return toolResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.statistics.errorsEncountered++;

      const toolResult: MCPToolResult = {
        id: toolCall.id,
        success: false,
        result: null,
        error: {
          code: -1,
          message: error instanceof Error ? error.message : String(error),
        },
        executionTime,
        timestamp: new Date().toISOString(),
        serverName,
        toolName,
      };

      this.emit(MCP_EVENTS.TOOL_FAILED, toolResult);
      return toolResult;
    }
  }

  /**
   * Get available tools for a server
   */
  getAvailableTools(serverName: string): string[] {
    const connectionInfo = this.connectionInfo.get(serverName);
    return connectionInfo?.toolsAvailable || [];
  }

  /**
   * Check if agent has permission to use tool
   */
  hasPermission(agent: string, serverName: string, toolName: string): boolean {
    const server = this.servers.get(serverName);
    const connectionInfo = this.connectionInfo.get(serverName);
    
    if (!server) return false;
    if (!server.enabled) return false;
    if (!connectionInfo?.connected) return false;
    if (!connectionInfo.toolsAvailable.includes(toolName)) return false;

    // TODO: Implement fine-grained permission checking
    // For now, allow all registered tools
    return true;
  }

  /**
   * List all registered MCP servers
   */
  listServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server status
   */
  getServerStatus(serverName: string): {
    name: string;
    exists: boolean;
    enabled: boolean;
    connected: boolean;
    tools: string[];
    capabilities: string[];
    connection: MCPConnectionInfo | null;
    statistics: MCPStatistics;
  } {
    const server = this.servers.get(serverName);
    const connection = this.connectionInfo.get(serverName);

    return {
      name: serverName,
      exists: !!server,
      enabled: server?.enabled || false,
      connected: connection?.connected || false,
      tools: connection?.toolsAvailable || [],
      capabilities: connection?.capabilities || [],
      connection: connection || null,
      statistics: this.getServerStatistics(serverName),
    };
  }

  /**
   * Get client statistics
   */
  getStatistics(): MCPStatistics {
    return {
      ...this.statistics,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get server-specific statistics
   */
  private getServerStatistics(serverName: string): MCPStatistics {
    // In a real implementation, track per-server statistics
    return {
      messagesSent: 0,
      messagesReceived: 0,
      toolsExecuted: 0,
      errorsEncountered: 0,
      uptime: 0,
      averageResponseTime: 0,
      serverConnections: this.connectionInfo.get(serverName)?.connected ? 1 : 0,
    };
  }

  private async handleConnectionOpen(serverName: string, ws: WebSocket): Promise<void> {
    console.log(`WebSocket connection opened: ${serverName}`);
    this.reconnectAttempts.set(serverName, 0);
  }

  private async handleMessage(serverName: string, data: WebSocket.Data): Promise<void> {
    try {
      const message: MCPMessage = JSON.parse(data.toString());
      this.statistics.messagesReceived++;
      this.emit(MCP_EVENTS.MESSAGE_RECEIVED, { serverName, message });

      if (message.id && this.pendingRequests.has(message.id)) {
        // Response to a pending request
        const pending = this.pendingRequests.get(message.id)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message);
        }
      } else if (message.method) {
        // Notification or event
        this.handleNotification(serverName, message);
      }
    } catch (error) {
      console.error(`Failed to handle message from ${serverName}:`, error);
      this.statistics.errorsEncountered++;
    }
  }

  private handleNotification(serverName: string, message: MCPMessage): void {
    const eventKey = `${serverName}:${message.method}`;
    this.emit(eventKey, message.params);
    this.emit('notification', { serverName, method: message.method, params: message.params });
  }

  private handleConnectionClose(serverName: string): void {
    const connectionInfo = this.connectionInfo.get(serverName);
    if (connectionInfo) {
      connectionInfo.connected = false;
    }

    this.connections.delete(serverName);
    
    // Attempt to reconnect if configured
    this.scheduleReconnect(serverName);
    
    this.emit(MCP_EVENTS.SERVER_DISCONNECTED, { serverName });
    console.log(`MCP server disconnected: ${serverName}`);
  }

  private handleConnectionError(serverName: string, error: Error): void {
    const connectionInfo = this.connectionInfo.get(serverName);
    if (connectionInfo) {
      connectionInfo.connected = false;
    }

    this.statistics.errorsEncountered++;
    this.emit(MCP_EVENTS.SERVER_ERROR, { serverName, error });
    console.error(`MCP server error ${serverName}:`, error);
  }

  private async waitForConnection(serverName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout: ${serverName}`));
      }, 10000);

      const checkConnection = () => {
        const ws = this.connections.get(serverName);
        if (ws && ws.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  private async performHandshake(serverName: string): Promise<void> {
    const clientInfo: MCPClientInfo = {
      name: 'supadupacode-cli',
      version: '2.0.0',
      capabilities: {
        tools: true,
        notifications: true,
        streaming: false,
        compression: this.config.enableCompression,
        encryption: this.config.enableEncryption,
      },
    };

    const initParams: MCPInitializeParams = {
      protocolVersion: MCP_PROTOCOL.VERSION,
      capabilities: clientInfo.capabilities,
      clientInfo,
    };

    await this.sendMessageAndWaitForResponse(serverName, {
      id: this.generateMessageId(),
      method: MCP_PROTOCOL.METHODS.INITIALIZE,
      params: initParams,
      jsonrpc: '2.0',
    });
  }

  private async discoverTools(serverName: string): Promise<void> {
    try {
      const result = await this.sendMessageAndWaitForResponse(serverName, {
        id: this.generateMessageId(),
        method: MCP_PROTOCOL.METHODS.TOOLS_LIST,
        jsonrpc: '2.0',
      });

      const connectionInfo = this.connectionInfo.get(serverName);
      if (connectionInfo && result.result?.tools) {
        connectionInfo.toolsAvailable = result.result.tools.map((tool: any) => tool.name);
        connectionInfo.capabilities = result.result.tools.map((tool: any) => tool.name);
      }
    } catch (error) {
      console.warn(`Failed to discover tools for ${serverName}:`, error);
    }
  }

  private async sendMessage(serverName: string, message: MCPMessage): Promise<void> {
    const ws = this.connections.get(serverName);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Server not connected: ${serverName}`);
    }

    const messageStr = JSON.stringify(message);
    ws.send(messageStr);
    this.statistics.messagesSent++;
    this.emit(MCP_EVENTS.MESSAGE_SENT, { serverName, message });
  }

  private async sendMessageAndWaitForResponse(serverName: string, message: MCPMessage, timeout?: number): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.config.messageTimeout;
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(message.id!);
        reject(new Error(`Message timeout: ${message.method}`));
      }, timeoutMs);

      this.pendingRequests.set(message.id!, {
        resolve,
        reject,
        timeout: timeoutHandle,
        timestamp: Date.now(),
      });

      this.sendMessage(serverName, message).catch(error => {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(message.id!);
        reject(error);
      });
    });
  }

  private scheduleReconnect(serverName: string): void {
    const attempts = this.reconnectAttempts.get(serverName) || 0;
    
    if (attempts >= this.config.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for: ${serverName}`);
      return;
    }

    const delay = this.config.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    this.reconnectAttempts.set(serverName, attempts + 1);

    setTimeout(async () => {
      try {
        await this.connect(serverName);
        this.reconnectAttempts.set(serverName, 0);
      } catch (error) {
        console.error(`Reconnect failed for ${serverName}:`, error);
        this.scheduleReconnect(serverName);
      }
    }, delay);
  }

  private updateAverageResponseTime(responseTime: number): void {
    const total = this.statistics.toolsExecuted;
    const current = this.statistics.averageResponseTime;
    this.statistics.averageResponseTime = ((current * (total - 1)) + responseTime) / total;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageId}`;
  }

  /**
   * Shutdown all connections and cleanup
   */
  async shutdown(): Promise<void> {
    // Disconnect all servers
    const disconnectPromises = Array.from(this.servers.keys()).map(serverName => 
      this.disconnect(serverName)
    );

    await Promise.allSettled(disconnectPromises);

    // Clear all data
    this.servers.clear();
    this.connections.clear();
    this.connectionInfo.clear();
    this.pendingRequests.clear();
    this.reconnectAttempts.clear();

    this.removeAllListeners();
    console.log('sdMCPClient shutdown complete');
  }
}