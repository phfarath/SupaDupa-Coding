import { Router, Request, Response } from 'express';
import { PlannerInputDTO, PlannerPlanDTO } from '../../../shared/contracts/plan-schema';
import { sdPlannerOrchestrator } from '../../agents/planner/plan-orchestrator';
import { sdCodebaseLoader } from '../../../shared/utils/codebase-loader';
import { llmClientFactory } from '../../config/llm';
import { validateRequestBody, asyncHandler } from '../middleware/validation';
import { systemEvents, SystemEvent } from '../../../shared/events/event-emitter';
import path from 'path';

const router = Router();

let orchestrator: sdPlannerOrchestrator;
let codebaseLoader: sdCodebaseLoader;

export function initializePlanRoute(): void {
  orchestrator = new sdPlannerOrchestrator({
    persistOutput: true,
  });
  
  codebaseLoader = new sdCodebaseLoader({
    maxFileSize: 500 * 1024,
    maxFiles: 500,
  });

  llmClientFactory.initialize().catch(err => {
    console.error('Failed to initialize LLM client factory:', err);
  });
}

router.post(
  '/',
  validateRequestBody(),
  asyncHandler(async (req: Request, res: Response) => {
    const input: PlannerInputDTO = req.body;
    
    try {
      const repositoryPath = process.env.REPOSITORY_PATH || process.cwd();
      
      let codebaseContext = '';
      if (input.context?.artifacts || input.context?.existingArtifacts) {
        try {
          const snapshot = await codebaseLoader.loadCodebase(
            repositoryPath,
            input.context.artifacts || input.context.existingArtifacts
          );
          codebaseContext = codebaseLoader.formatAsContext(snapshot, 50000);
        } catch (error) {
          console.warn('Failed to load codebase context:', (error as Error).message);
        }
      }

      const enhancedInput: PlannerInputDTO = {
        ...input,
        context: {
          ...input.context,
          projectType: input.context?.projectType || 'typescript',
        },
      };

      const plan: PlannerPlanDTO = orchestrator.createExecutionPlan(enhancedInput);

      systemEvents.emit(SystemEvent.PLAN_CREATED, {
        plan,
        input: enhancedInput,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        plan,
        metadata: {
          codebaseAnalyzed: codebaseContext.length > 0,
          repositoryPath,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      systemEvents.emit(SystemEvent.PLAN_FAILED, {
        input,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      console.error('Plan creation failed:', error);

      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const registry = llmClientFactory.getRegistry();
  const providers = registry.list();

  res.status(200).json({
    status: 'healthy',
    orchestrator: 'ready',
    providers: providers.length,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/queue', asyncHandler(async (req: Request, res: Response) => {
  const { plannerExecutionQueue } = await import('../../agents/planner/queue');
  
  const snapshot = plannerExecutionQueue.getSnapshot();
  
  res.status(200).json({
    success: true,
    queue: {
      size: plannerExecutionQueue.size(),
      isEmpty: plannerExecutionQueue.isEmpty(),
      items: snapshot,
    },
    timestamp: new Date().toISOString(),
  });
}));

export { router as planRouter };
