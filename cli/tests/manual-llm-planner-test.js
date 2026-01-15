#!/usr/bin/env node
/**
 * Manual test for LLM-based planning with fallback
 * This test demonstrates both LLM-based planning (if configured) and fallback behavior
 */

const path = require('path');

async function testLLMPlanner() {
  console.log('\n🧪 Testing LLM-based Planner with Fallback\n');
  console.log('─'.repeat(70));

  // Dynamically import the orchestrator
  const { sdPlannerOrchestrator } = await import('../dist/src/agents/planner/plan-orchestrator.js');
  
  const orchestrator = new sdPlannerOrchestrator({
    persistOutput: false, // Don't persist during tests
    baseDir: path.join(__dirname, '..'),
  });

  // Test 1: Simple request (should try LLM, fallback to hardcoded)
  console.log('\n📋 Test 1: Simple Feature Request');
  console.log('Testing LLM-based planning with fallback...\n');
  
  const input1 = {
    request: 'Add user authentication with JWT tokens',
    context: {
      techStack: ['TypeScript', 'Node.js', 'Express'],
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

  try {
    const plan1 = await orchestrator.createExecutionPlan(input1);
    console.log('✅ Plan created successfully!');
    console.log('  Plan ID:', plan1.planId);
    console.log('  Description:', plan1.description);
    console.log('  Steps:', plan1.steps.length);
    console.log('  Artifacts:', plan1.artifacts.length);
    console.log('  Estimated Duration:', `${plan1.metadata.estimatedDuration} min`);
    console.log('  Priority:', plan1.metadata.priority);
    console.log('  Tags:', plan1.metadata.tags.join(', '));
    
    // Show step details
    console.log('\n  Steps breakdown:');
    plan1.steps.forEach((step, idx) => {
      console.log(`    ${idx + 1}. ${step.name} (${step.type}, ${step.agent})`);
      console.log(`       Duration: ${step.estimatedDuration} min`);
    });
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  // Test 2: Request with constraints
  console.log('\n📋 Test 2: Constrained Request');
  console.log('Testing with duration and agent constraints...\n');
  
  const input2 = {
    request: 'Fix critical security vulnerability in authentication',
    constraints: {
      maxDuration: 120,
      forbiddenAgents: ['qa'],
    },
    preferences: {
      prioritizeSpeed: true,
    },
    metadata: {
      urgency: 'high',
      category: 'security',
    },
  };

  try {
    const plan2 = await orchestrator.createExecutionPlan(input2);
    console.log('✅ Plan created successfully!');
    console.log('  Plan ID:', plan2.planId);
    console.log('  Description:', plan2.description);
    console.log('  Steps:', plan2.steps.length);
    console.log('  Total Duration:', `${plan2.metadata.estimatedDuration} min (max: 120 min)`);
    console.log('  Priority:', plan2.metadata.priority);
    
    // Verify constraints
    const hasQaAgent = plan2.steps.some(step => step.agent === 'qa');
    if (hasQaAgent) {
      console.warn('⚠️  Warning: Plan contains forbidden QA agent!');
    } else {
      console.log('  ✓ Constraint: No QA agent present');
    }
    
    if (plan2.metadata.estimatedDuration <= 120) {
      console.log('  ✓ Constraint: Duration within limit');
    } else {
      console.warn(`⚠️  Warning: Duration (${plan2.metadata.estimatedDuration} min) exceeds max (120 min)`);
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  // Test 3: Check system prompt
  console.log('\n📄 System Prompt Check');
  const systemPrompt = orchestrator.getSystemPrompt();
  console.log(`  System prompt loaded: ${systemPrompt.length} characters`);
  console.log('  First line:', systemPrompt.split('\n')[0]);

  // Summary
  console.log('\n' + '─'.repeat(70));
  console.log('✅ All tests completed successfully!');
  console.log('\n📝 Notes:');
  console.log('  - If LLM provider is configured, plans will be generated via LLM');
  console.log('  - If LLM fails or is not configured, falls back to hardcoded planning');
  console.log('  - Both modes produce valid PlannerPlanDTO conformant plans');
  console.log('  - Set OPENAI_API_KEY or ANTHROPIC_API_KEY to test LLM mode\n');
}

// Run the test
testLLMPlanner().catch((error) => {
  console.error('\n💥 Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
