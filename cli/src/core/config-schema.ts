/**
 * Configuration Schema - JSON Schema for validating configuration
 */

export interface ConfigSchema {
  type: 'object';
  required: string[];
  properties: {
    agents: {
      type: 'object';
      patternProperties: {
        '^[a-zA-Z0-9_-]+$': {
          type: 'object';
          required: string[];
          properties: {
            enabled: { type: 'boolean' };
            role: { type: 'string'; minLength: number };
            mcp_tools: {
              type: 'array';
              items: { type: 'string' };
              minItems: number;
            };
          };
          additionalProperties: boolean;
        };
      };
      minProperties: number;
    };
    mcp: {
      type: 'object';
      required: string[];
      properties: {
        servers: {
          type: 'object';
          patternProperties: {
            '^[a-zA-Z0-9_-]+$': {
              type: 'object';
              required: string[];
              properties: {
                enabled: { type: 'boolean' };
                endpoint: { type: 'string' };
                tools: {
                  type: 'array';
                  items: { type: 'string' };
                };
                permissions: {
                  type: 'array';
                  items: { type: 'string' };
                };
              };
              additionalProperties: boolean;
            };
          };
        };
      };
      additionalProperties: boolean;
    };
    git: {
      type: 'object';
      required: string[];
      properties: {
        branchPrefix: { type: 'string'; minLength: number };
        commitMessageFormat: { type: 'string'; minLength: number };
        requirePR: { type: 'boolean' };
        autoMerge: { type: 'boolean' };
      };
      additionalProperties: boolean;
    };
    orchestration: {
      type: 'object';
      required: string[];
      properties: {
        defaultMode: {
          type: 'string';
          enum: string[];
        };
        retries: {
          type: 'integer';
          minimum: number;
          maximum: number;
        };
        timeout: {
          type: 'integer';
          minimum: number;
        };
      };
      additionalProperties: boolean;
    };
    authentication: {
      type: 'object';
      properties: {
        enabled: { type: 'boolean' };
        tokenPath: { type: 'string' };
      };
      additionalProperties: boolean;
    };
  };
  additionalProperties: boolean;
}

export const configSchema: ConfigSchema = {
  type: 'object',
  required: ['agents', 'mcp', 'git', 'orchestration'],
  properties: {
    agents: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9_-]+$': {
          type: 'object',
          required: ['enabled', 'role', 'mcp_tools'],
          properties: {
            enabled: { type: 'boolean' },
            role: { type: 'string', minLength: 1 },
            mcp_tools: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1
            }
          },
          additionalProperties: false
        }
      },
      minProperties: 1
    },
    mcp: {
      type: 'object',
      required: ['servers'],
      properties: {
        servers: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9_-]+$': {
              type: 'object',
              required: ['enabled'],
              properties: {
                enabled: { type: 'boolean' },
                endpoint: { type: 'string' },
                tools: {
                  type: 'array',
                  items: { type: 'string' }
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              additionalProperties: true
            }
          }
        }
      },
      additionalProperties: false
    },
    git: {
      type: 'object',
      required: ['branchPrefix', 'commitMessageFormat'],
      properties: {
        branchPrefix: { type: 'string', minLength: 1 },
        commitMessageFormat: { type: 'string', minLength: 1 },
        requirePR: { type: 'boolean' },
        autoMerge: { type: 'boolean' }
      },
      additionalProperties: false
    },
    orchestration: {
      type: 'object',
      required: ['defaultMode'],
      properties: {
        defaultMode: {
          type: 'string',
          enum: ['sequential', 'concurrent', 'handoff']
        },
        retries: {
          type: 'integer',
          minimum: 0,
          maximum: 10
        },
        timeout: {
          type: 'integer',
          minimum: 1000
        }
      },
      additionalProperties: false
    },
    authentication: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        tokenPath: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: true
};