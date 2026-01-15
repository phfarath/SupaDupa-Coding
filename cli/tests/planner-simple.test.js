#!/usr/bin/env node
/**
 * Simple test script for sdPlannerOrchestrator
 * Run with: node test-planner-simple.js
 */

const { sdPlannerOrchestrator } = require('./dist/src/agents/planner/plan-orchestrator');

async function testPlanner() {
  console.log('\n🧪 Testing sdPlannerOrchestrator\n');
  console.log('─'.repeat(60));

  const orchestrator = new sdPlannerOrchestrator({
    persistOutput: true,
  });

  // Test 1: Simple planning request
  console.log('\n📋 Test 1: Simple Feature Request');
  const input1 = {
    request: 'Implementar sistema de autenticação JWT com refresh tokens',
    context: {
      techStack: ['TypeScript', 'Node.js', 'Express', 'JWT'],
      projectType: 'API',
    },
    preferences: {
      prioritizeQuality: true,
    },
    metadata: {
      urgency: 'medium',
      category: 'authentication',
    },
  };

  const plan1 = orchestrator.createExecutionPlan(input1);
  console.log('✓ Plan created:', plan1.planId);
  console.log('  Description:', plan1.description);
  console.log('  Steps:', plan1.steps.length);
  console.log('  Artifacts:', plan1.artifacts.length);
  console.log('  Estimated Duration:', `${plan1.metadata.estimatedDuration}min`);
  console.log('  Priority:', plan1.metadata.priority);

  // Test 2: Fast track planning
  console.log('\n📋 Test 2: Fast Track Request');
  const input2 = {
    request: 'Corrigir bug no endpoint de login',
    preferences: {
      prioritizeSpeed: true,
    },
    metadata: {
      urgency: 'high',
      category: 'bugfix',
    },
  };

  const plan2 = orchestrator.createExecutionPlan(input2);
  console.log('✓ Plan created:', plan2.planId);
  console.log('  Steps:', plan2.steps.length);
  console.log('  Estimated Duration:', `${plan2.metadata.estimatedDuration}min`);
  console.log('  Priority:', plan2.metadata.priority);

  // Test system prompt
  console.log('\n📄 System Prompt');
  const systemPrompt = orchestrator.getSystemPrompt();
  const promptPreview = systemPrompt.split('\n').slice(0, 5).join('\n');
  console.log(promptPreview);
  console.log(`... (${systemPrompt.length} characters total)`);

  console.log('\n' + '─'.repeat(60));
  console.log('✓ All tests completed successfully!\n');
}

// Run tests
testPlanner().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
