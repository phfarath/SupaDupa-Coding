/**
 * MCP Protocol Contracts
 * Defines interfaces for Model Context Protocol implementation
 */

export interface MCPMessage {
  id: string;
  method: string;
  params?: Record<string, any>;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  jsonrpc?: string;
}

export interface MCPServerConfig {
  name: string;
  endpoint: string;
  enabled: boolean;
  tools: MCPTool[];
  capabilities: string[];
  permissions: string[];
  maxConnections?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    schema?: any;
  }[];
  returns?: {
    type: string;
    description: string;
    schema?: any;
  };
}

export interface MCPCommitParams {
  agent: string;
  scope: string;
  description: string;
  files?: string[];
  autoStage?: boolean;
  message?: string;
}

export interface MCPCommitResult {
  commitHash: string;
  branch: string;
  files: string[];
  message: string;
  timestamp: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface MCPConnectionInfo {
  serverName: string;
  endpoint: string;
  connected: boolean;
  connectedAt?: string;
  lastHeartbeat?: string;
  toolsAvailable: string[];
  capabilities: string[];
}

export interface MCPClientConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  servers: MCPServerConfig[];
}

export interface MCPToolCall {
  id: string;
  serverName: string;
  toolName: string;
  parameters: Record<string, any>;
  timestamp: string;
  timeout?: number;
}

export interface MCPToolResult {
  id: string;
  success: boolean;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  executionTime: number;
  timestamp: string;
  serverName: string;
  toolName: string;
}

// MCP Protocol constants
export const MCP_PROTOCOL = {
  VERSION: '2024-11-05',
  METHODS: {
    INITIALIZE: 'initialize',
    TOOLS_LIST: 'tools/list',
    TOOLS_CALL: 'tools/call',
    NOTIFICATIONS_SUBSCRIBE: 'notifications/subscribe',
    NOTIFICATIONS_UNSUBSCRIBE: 'notifications/unsubscribe',
  },
  ERRORS: {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    SERVER_ERROR: -32000,
    TIMEOUT_ERROR: -32001,
    CONNECTION_ERROR: -32002,
  },
  TOOLS: {
    GIT_COMMIT: 'git/commit',
    GIT_STATUS: 'git/status',
    GIT_DIFF: 'git/diff',
    GIT_PUSH: 'git/push',
    FILESYSTEM_READ: 'filesystem/read',
    FILESYSTEM_WRITE: 'filesystem/write',
    FILESYSTEM_LIST: 'filesystem/list',
    TEST_RUN: 'test/run',
    TEST_LIST: 'test/list',
    BUILD_EXECUTE: 'build/execute',
    BUILD_CLEAN: 'build/clean',
  },
} as const;

// MCP Events
export const MCP_EVENTS = {
  SERVER_CONNECTED: 'SD_EVENT_MCP_SERVER_CONNECTED',
  SERVER_DISCONNECTED: 'SD_EVENT_MCP_SERVER_DISCONNECTED',
  SERVER_ERROR: 'SD_EVENT_MCP_SERVER_ERROR',
  TOOL_EXECUTED: 'SD_EVENT_MCP_TOOL_EXECUTED',
  TOOL_FAILED: 'SD_EVENT_MCP_TOOL_FAILED',
  MESSAGE_RECEIVED: 'SD_EVENT_MCP_MESSAGE_RECEIVED',
  MESSAGE_SENT: 'SD_EVENT_MCP_MESSAGE_SENT',
  HEARTBEAT_RECEIVED: 'SD_EVENT_MCP_HEARTBEAT_RECEIVED',
} as const;

export type MCPEventType = typeof MCP_EVENTS[keyof typeof MCP_EVENTS];
export type MCPMethod = typeof MCP_PROTOCOL.METHODS[keyof typeof MCP_PROTOCOL.METHODS];
export type MCPToolName = typeof MCP_PROTOCOL.TOOLS[keyof typeof MCP_PROTOCOL.TOOLS];

// MCP Server Types
export interface MCPServerCapabilities {
  tools: boolean;
  notifications: boolean;
  streaming: boolean;
  compression: boolean;
  encryption: boolean;
}

export interface MCPClientInfo {
  name: string;
  version: string;
  capabilities: MCPServerCapabilities;
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  clientInfo: MCPClientInfo;
}

// MCP Validation
export interface MCPValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  message: string;
}

// MCP Statistics
export interface MCPStatistics {
  messagesSent: number;
  messagesReceived: number;
  toolsExecuted: number;
  errorsEncountered: number;
  uptime: number;
  averageResponseTime: number;
  serverConnections: number;
}