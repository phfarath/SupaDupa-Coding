import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv';

const ajv = new Ajv();

const plannerInputSchema = {
  type: 'object',
  properties: {
    request: {
      type: 'string',
      minLength: 1,
    },
    context: {
      type: 'object',
      properties: {
        techStack: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        existingArtifacts: {
          type: 'array',
          items: { type: 'string' },
        },
        artifacts: {
          type: 'array',
          items: { type: 'string' },
        },
        relatedArtifacts: {
          type: 'array',
          items: { type: 'string' },
        },
        projectType: {
          type: 'string',
        },
        constraints: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: true,
    },
    preferences: {
      type: 'object',
      properties: {
        prioritizeSpeed: { type: 'boolean' },
        prioritizeQuality: { type: 'boolean' },
        minimizeCost: { type: 'boolean' },
        preferredAgents: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: true,
    },
    constraints: {
      type: 'object',
      properties: {
        maxDuration: { type: 'number' },
        forbiddenAgents: {
          type: 'array',
          items: { type: 'string' },
        },
        requiredAgents: {
          type: 'array',
          items: { type: 'string' },
        },
        maxCost: { type: 'number' },
        deadline: { type: 'string' },
      },
      additionalProperties: true,
    },
    metadata: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        category: { type: 'string' },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        requestedBy: { type: 'string' },
      },
      additionalProperties: true,
    },
  },
  required: ['request'],
  additionalProperties: true,
};

const validatePlannerInput = ajv.compile(plannerInputSchema);

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequestBody(schema?: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validate = schema || validatePlannerInput;
    
    if (!req.body) {
      res.status(400).json({
        error: 'Request body is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const valid = validate(req.body);

    if (!valid) {
      const errors: ValidationError[] = (validate.errors || []).map(err => ({
        field: err.instancePath || err.schemaPath,
        message: err.message || 'Validation failed',
      }));

      res.status(400).json({
        error: 'Validation failed',
        errors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('API Error:', err);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  const response: any = {
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(500).json(response);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
