/**
 * LLM Request and Response contracts for API providers
 */

export interface LlmRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: any; // Allow additional provider-specific options
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  id: string;
  choices: Choice[];
  created: number;
  model: string;
  object: string;
  usage?: Usage;
  [key: string]: any; // Allow additional provider-specific fields
}

export interface Choice {
  finish_reason: string;
  index: number;
  message: Message;
}

export interface Usage {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
}

// LLM-specific events
export const LLM_EVENTS = {
  LLM_REQUEST_STARTED: 'llm:request:started',
  LLM_REQUEST_COMPLETED: 'llm:request:completed',
  LLM_REQUEST_FAILED: 'llm:request:failed',
  PROVIDER_REGISTERED: 'llm:provider:registered',
  PROVIDER_UNREGISTERED: 'llm:provider:unregistered',
} as const;