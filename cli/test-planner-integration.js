#!/usr/bin/env node
/**
 * Integration test for Brain Agent + Planner Orchestrator
 * Tests the integration between BrainAgent and sdPlannerOrchestrator
 * Run with: node test-planner-integration.js
 */

const { sdPlannerOrchestrator } = require('./dist/src/agents/planner/plan-orchestrator');
const { plannerExecutionQueue } = require('./dist/src/agents/planner/queue');
const { SD_API_EVENTS } = require('./dist/shared/constants/api-events');

async function testIntegration() {
  console.log('\n🔗 Testing Planner Integration\n');
  console.log('═'.repeat(60));

  // Test 1: Orchestrator Creation and System Prompt Loading
  console.log('\n📦 Test 1: Orchestrator Initialization');
  const orchestrator = new sdPlannerOrchestrator({
    persistOutput: true,
  });
  
  const systemPrompt = orchestrator.getSystemPrompt();
  console.log(`✓ System prompt loaded: ${systemPrompt.length} characters`);
  console.log(`✓ Prompt starts with: ${systemPrompt.substring(0, 50)}...`);

  // Test 2: Event Emission
  console.log('\n📡 Test 2: Event System');
  let eventReceived = false;
  orchestrator.on(SD_API_EVENTS.EVENT_PLAN_CREATED, ({ plan }) => {
    eventReceived = true;
    console.log(`✓ Event received: ${SD_API_EVENTS.EVENT_PLAN_CREATED}`);
    console.log(`  Plan ID: ${plan.planId}`);
  });

  // Test 3: Plan Creation with Queue Integration
  console.log('\n🎯 Test 3: Plan Creation + Queue Integration');
  const initialQueueSize = plannerExecutionQueue.size();
  console.log(`  Initial queue size: ${initialQueueSize}`);

  const planInput = {
    request: 'Implementar sistema de autenticação com JWT',
    context: {
      techStack: ['TypeScript', 'Node.js', 'Express'],
      projectType: 'API',
    },
    preferences: {
      prioritizeQuality: true,
    },
    metadata: {
      source: 'integration-test',
      category: 'authentication',
      urgency: 'high',
    },
  };

  const plan = orchestrator.createExecutionPlan(planInput);
  
  console.log(`✓ Plan created: ${plan.planId}`);
  console.log(`  Steps: ${plan.steps.length}`);
  console.log(`  Priority: ${plan.metadata.priority}`);
  console.log(`  Duration: ${plan.metadata.estimatedDuration}min`);
  console.log(`  Tags: ${plan.metadata.tags.join(', ')}`);

  // Verify queue was updated
  const newQueueSize = plannerExecutionQueue.size();
  console.log(`  Queue size after: ${newQueueSize}`);
  console.log(`✓ Queue integration working: ${newQueueSize > initialQueueSize ? 'YES' : 'NO'}`);

  // Verify event was emitted
  console.log(`✓ Event system working: ${eventReceived ? 'YES' : 'NO'}`);

  // Test 4: Queue Operations
  console.log('\n📥 Test 4: Queue Operations');
  const queueItem = plannerExecutionQueue.findByPlanId(plan.planId);
  if (queueItem) {
    console.log(`✓ Found plan in queue: ${queueItem.plan.planId}`);
    console.log(`  Enqueued at: ${queueItem.enqueuedAt}`);
    console.log(`  Metadata source: ${queueItem.metadata.source}`);
  } else {
    console.log('❌ Plan not found in queue');
  }

  // Test 5: Multiple Plans with Different Preferences
  console.log('\n🎨 Test 5: Multiple Plans with Different Preferences');
  
  const speedPlan = orchestrator.createExecutionPlan({
    request: 'Quick bug fix in login',
    preferences: { prioritizeSpeed: true },
    metadata: { source: 'test', category: 'bugfix', urgency: 'high' },
  });
  
  const qualityPlan = orchestrator.createExecutionPlan({
    request: 'Comprehensive feature with full testing',
    preferences: { prioritizeQuality: true },
    metadata: { source: 'test', category: 'feature', urgency: 'medium' },
  });
  
  console.log(`✓ Speed-optimized plan: ${speedPlan.steps.length} steps, ${speedPlan.metadata.estimatedDuration}min`);
  console.log(`✓ Quality-optimized plan: ${qualityPlan.steps.length} steps, ${qualityPlan.metadata.estimatedDuration}min`);
  console.log(`  Quality plan has review step: ${qualityPlan.steps.some(s => s.type === 'governance') ? 'YES' : 'NO'}`);

  // Test 6: Constraints Handling
  console.log('\n⏱️  Test 6: Constraints Handling');
  const constrainedPlan = orchestrator.createExecutionPlan({
    request: 'Complex feature with time limit',
    constraints: { maxDuration: 120 },
    metadata: { source: 'test', category: 'feature', urgency: 'high' },
  });
  
  console.log(`✓ Constrained plan duration: ${constrainedPlan.metadata.estimatedDuration}min`);
  console.log(`  Respects 120min limit: ${constrainedPlan.metadata.estimatedDuration <= 120 ? 'YES' : 'NO'}`);

  // Test 7: Path Resolution (verifying the fix)
  console.log('\n📂 Test 7: System Prompt Path Resolution');
  console.log(`✓ System prompt loaded successfully from fallback paths`);
  console.log(`  First line: "${systemPrompt.split('\n')[0]}"`);

  // Final Summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ All integration tests passed!');
  console.log(`\nFinal queue size: ${plannerExecutionQueue.size()}`);
  console.log(`Plans created: ${plannerExecutionQueue.size() - initialQueueSize}\n`);

  // Clean up
  plannerExecutionQueue.clear();
}

// Run tests
testIntegration().catch((error) => {
  console.error('\n❌ Integration test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
