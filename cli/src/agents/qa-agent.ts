/**
 * QA Agent - handles testing and quality assurance tasks
 */

import { sdBaseAgent, AgentTask } from './base-agent';
import { sdProviderRegistry } from '../api/provider-registry';
import { ITool } from '../../shared/contracts/tool-schema';

export interface QAResult {
  status: string;
  message: string;
  artifacts: {
    testCases: number;
    passed: number;
    failed: number;
    coverage: string;
  };
}

export class QaAgent extends sdBaseAgent {
  private tools: Map<string, ITool> = new Map();

  constructor(config: any = {}, providerRegistry?: sdProviderRegistry) {
    const fullConfig = {
      id: 'qa',
      name: 'qa',
      type: 'qa' as const,
      capabilities: ['testing', 'validation', 'quality-assurance'],
      api: config.api || {
        provider: 'openai',
        model: 'gpt-4',
        credentials: {}
      },
      tools: config.tools || [],
      systemPrompt: config.systemPrompt || 'You are a QA agent specialized in Software Testing. Your goal is to ensure code quality by writing and executing tests.',
      settings: config.settings || {}
    };
    super(fullConfig, providerRegistry || new sdProviderRegistry());

    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    const { ReadFileTool, WriteFileTool, ListDirTool, RunCommandTool } = require('../tools/file-tools');

    this.registerTool(new ReadFileTool());
    this.registerTool(new WriteFileTool());
    this.registerTool(new ListDirTool());
    this.registerTool(new RunCommandTool());
  }

  public registerTool(tool: ITool) {
    this.tools.set(tool.definition.name, tool);
  }

  protected buildUserPrompt(task: AgentTask): string {
    const toolDefinitions = Array.from(this.tools.values()).map(t => t.definition);
    return `
Task: ${task.description}

Available Tools:
${JSON.stringify(toolDefinitions, null, 2)}

Instructions:
1. Analyze the testing requirements.
2. Use 'list_dir' and 'read_file' to understand the code to be tested.
3. specific instructions:
   - If asked to create tests, use 'write_file' to create test files (e.g. *.test.ts).
   - If asked to run tests, use 'run_command' (e.g. npm test).
4. Analyze the test results.
5. Return a final status when done.

IMPORTANT: To use a tool, your response MUST be a valid JSON object with this structure:
{
  "tool": "tool_name",
  "parameters": { ... }
}

If you have completed the task, respond with:
{
  "status": "completed",
  "message": "Description of what was done",
  "artifacts": {
    "testCases": 0,
    "passed": 0,
    "failed": 0,
    "coverage": "0%"
  }
}
`;
  }

  async execute(task: AgentTask): Promise<QAResult> {
    console.log(`\n🧪 QA Agent started: ${task.description}`);

    const maxSteps = 10;
    const history: any[] = [];

    for (let i = 0; i < maxSteps; i++) {
      const systemPrompt = this.config.systemPrompt || 'You are a QA expert.';
      const userPrompt = this.buildUserPrompt(task);

      try {
        const response = await this.callLLM(systemPrompt, userPrompt, history);

        // Handle tool calls
        if (response.tool) {
          console.log(`\nExecuting tool: ${response.tool}`);
          const tool = this.tools.get(response.tool);
          if (tool) {
            try {
              const result = await tool.execute(response.parameters);
              history.push({
                role: 'assistant',
                content: JSON.stringify(response)
              });
              history.push({
                role: 'user',
                content: `Tool Output: ${JSON.stringify(result)}`
              });
            } catch (err) {
              history.push({
                role: 'user',
                content: `Tool Error: ${(err as Error).message}`
              });
            }
          } else {
            history.push({
              role: 'user',
              content: `Error: Tool ${response.tool} not found.`
            });
          }
        } else if (response.status === 'completed') {
          return {
            status: response.status,
            message: response.message,
            artifacts: response.artifacts || {
              testCases: 0, passed: 0, failed: 0, coverage: '0%'
            }
          };
        } else {
          // Fallback if LLM doesn't follow protocol (treat as comment/log)
          history.push({
            role: 'assistant',
            content: JSON.stringify(response)
          });
        }

      } catch (error) {
        console.error('QA Agent Loop Error:', error);
        throw error;
      }
    }

    return {
      status: 'failed',
      message: 'Max steps reached without completion',
      artifacts: { testCases: 0, passed: 0, failed: 0, coverage: '0%' }
    };
  }

  protected processLLMResponse(response: any): any {
    return response;
  }

  private async callLLM(system: string, user: string, history: any[]): Promise<any> {
    const providers = this.providerRegistry.list();
    if (providers.length === 0) throw new Error('No providers available');
    const providerId = providers[0];

    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: user }
    ];

    const request = {
      messages,
      parameters: { temperature: 0.1 }
    };

    const response = await this.providerRegistry.execute(providerId, request);

    try {
      let content = response.content.trim();
      // Remove markdown code blocks if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Heuristic fix for unquoted string values (same as BrainAgent)
      content = content.replace(/\"(\w+)\":\s*([a-zA-Z]+)(?=\s*[,}])/g, (match, key, value) => {
        if (['true', 'false', 'null'].includes(value)) return match;
        return `"${key}": "${value}"`;
      });

      return JSON.parse(content);
    } catch (e) {
      console.warn('QA Agent failed to parse JSON:', response.content);
      // Retry logic or simple error
      // Let's assume the agent can self-correct if we feed back the error, 
      // but for now we throw to see it in logs
      // Or return a "please fix json" prompt?
      // Let's try to return a structured error that the loop handles?
      // For now, throw to fit existing pattern
      throw new Error(`Invalid JSON from LLM: ${response.content}`);
    }
  }
}