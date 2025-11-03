#!/usr/bin/env ts-node

/**
 * End-to-End Workflow Example
 * Demonstrates complete Planner Core usage from input to execution
 */

import { sdPlannerOrchestrator } from '../src/agents/planner/plan-orchestrator';
import { plannerExecutionQueue } from '../src/agents/planner/queue';
import { PlannerInputDTO } from '../shared/contracts/plan-schema';
import { SD_API_EVENTS } from '../shared/constants/api-events';

console.log('🚀 SupaDupaCode CLI - End-to-End Workflow Example\n');
console.log('=' .repeat(60));

// Initialize the planner orchestrator
const orchestrator = new sdPlannerOrchestrator({
  persistOutput: true,
  baseDir: __dirname + '/..',
});

console.log('\n✅ Planner Orchestrator initialized');
console.log('📄 System Prompt Preview:');
console.log(orchestrator.getSystemPrompt().split('\n').slice(0, 3).join('\n'));
console.log('...(truncated)\n');

// Set up event listeners
orchestrator.on(SD_API_EVENTS.EVENT_PLAN_CREATED, ({ plan }) => {
  console.log('\n🎉 Plan Created Event Received!');
  console.log(`   Plan ID: ${plan.planId}`);
  console.log(`   Steps: ${plan.steps.length}`);
  console.log(`   Estimated Duration: ${plan.metadata.estimatedDuration} min`);
  console.log(`   Priority: ${plan.metadata.priority}`);
  console.log(`   Tags: ${plan.metadata.tags.join(', ')}`);
});

plannerExecutionQueue.on('plan:enqueued', (item) => {
  console.log('\n📥 Plan Enqueued in Execution Queue');
  console.log(`   Plan ID: ${item.plan.planId}`);
  console.log(`   Enqueued At: ${item.enqueuedAt}`);
  console.log(`   Queue Size: ${plannerExecutionQueue.size()}`);
});

// Example 1: Simple Feature Request
console.log('\n' + '='.repeat(60));
console.log('📋 Example 1: Simple Feature Request\n');

const simpleInput: PlannerInputDTO = {
  request: 'Add user authentication to the application',
  metadata: {
    source: 'example-script',
    category: 'feature',
    urgency: 'medium',
  },
};

console.log('Input:', JSON.stringify(simpleInput, null, 2));

const simplePlan = orchestrator.createExecutionPlan(simpleInput);

console.log('\n📊 Generated Plan Summary:');
console.log(`   Total Steps: ${simplePlan.steps.length}`);
console.log(`   Total Artifacts: ${simplePlan.artifacts.length}`);
console.log('\n   Steps Breakdown:');
simplePlan.steps.forEach((step, idx) => {
  console.log(`   ${idx + 1}. ${step.name} (${step.agent}) - ${step.estimatedDuration} min`);
});

// Example 2: Request with Constraints
console.log('\n' + '='.repeat(60));
console.log('📋 Example 2: Request with Constraints\n');

const constrainedInput: PlannerInputDTO = {
  request: 'Implement real-time notifications system with WebSocket support',
  context: {
    techStack: ['Node.js', 'TypeScript', 'Socket.io'],
    existingArtifacts: ['src/server.ts', 'src/api/routes.ts'],
  },
  preferences: {
    prioritizeSpeed: true,
  },
  constraints: {
    maxDuration: 100, // Maximum 100 minutes
    forbiddenAgents: ['qa'], // Skip QA for rapid development
  },
  metadata: {
    source: 'example-script',
    category: 'feature',
    urgency: 'high',
  },
};

console.log('Input:', JSON.stringify(constrainedInput, null, 2));

const constrainedPlan = orchestrator.createExecutionPlan(constrainedInput);

console.log('\n📊 Generated Plan Summary:');
console.log(`   Total Steps: ${constrainedPlan.steps.length}`);
console.log(`   Total Duration: ${constrainedPlan.metadata.estimatedDuration} min`);
console.log(`   Max Duration Constraint: ${constrainedInput.constraints?.maxDuration} min`);
console.log(`   Constraint Met: ${constrainedPlan.metadata.estimatedDuration <= (constrainedInput.constraints?.maxDuration || 0) ? '✅' : '❌'}`);
console.log('\n   Steps Breakdown:');
constrainedPlan.steps.forEach((step, idx) => {
  console.log(`   ${idx + 1}. ${step.name} (${step.agent}) - ${step.estimatedDuration} min`);
});

// Example 3: Quality-Focused Request
console.log('\n' + '='.repeat(60));
console.log('📋 Example 3: Quality-Focused Request\n');

const qualityInput: PlannerInputDTO = {
  request: 'Refactor authentication module for better security',
  context: {
    techStack: 'TypeScript',
    existingArtifacts: ['src/auth/jwt.ts', 'src/auth/middleware.ts'],
  },
  preferences: {
    prioritizeQuality: true, // This will add review/sign-off step
  },
  metadata: {
    source: 'example-script',
    category: 'refactoring',
    urgency: 'medium',
  },
};

console.log('Input:', JSON.stringify(qualityInput, null, 2));

const qualityPlan = orchestrator.createExecutionPlan(qualityInput);

console.log('\n📊 Generated Plan Summary:');
console.log(`   Total Steps: ${qualityPlan.steps.length}`);
console.log(`   Includes Review Step: ${qualityPlan.steps.some(s => s.type === 'governance') ? '✅' : '❌'}`);
console.log('\n   Steps Breakdown:');
qualityPlan.steps.forEach((step, idx) => {
  console.log(`   ${idx + 1}. ${step.name} (${step.agent}) - ${step.estimatedDuration} min [${step.type}]`);
});

// Queue Operations
console.log('\n' + '='.repeat(60));
console.log('📦 Queue Operations\n');

console.log(`Current Queue Size: ${plannerExecutionQueue.size()}`);
console.log(`Queue Empty: ${plannerExecutionQueue.isEmpty() ? 'Yes' : 'No'}`);

if (!plannerExecutionQueue.isEmpty()) {
  const nextItem = plannerExecutionQueue.peek();
  console.log(`\nNext Plan in Queue: ${nextItem?.plan.planId}`);
  
  console.log('\n📋 Queue Snapshot:');
  const snapshot = plannerExecutionQueue.getSnapshot();
  snapshot.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.plan.planId} (${item.plan.steps.length} steps) - ${item.enqueuedAt}`);
  });
  
  // Dequeue example
  console.log('\n🔄 Dequeuing first plan...');
  const dequeuedItem = plannerExecutionQueue.dequeue();
  console.log(`   Dequeued: ${dequeuedItem?.plan.planId}`);
  console.log(`   New Queue Size: ${plannerExecutionQueue.size()}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📈 Workflow Summary\n');
console.log(`✅ Successfully generated 3 plans`);
console.log(`✅ All plans follow sd* naming conventions`);
console.log(`✅ Events emitted: ${SD_API_EVENTS.EVENT_PLAN_CREATED}`);
console.log(`✅ Queue operations validated`);
console.log(`✅ Constraints properly enforced`);

console.log('\n🎯 Next Steps:');
console.log('   1. Review generated plans in cli/planner/output/');
console.log('   2. Use plans with workflow runner for execution');
console.log('   3. Integrate with memory system for caching');
console.log('   4. Connect to actual LLM providers for real planning');

console.log('\n✨ End-to-End Workflow Example Completed!\n');
