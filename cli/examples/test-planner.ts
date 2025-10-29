#!/usr/bin/env ts-node
/**
 * Test script for sdPlannerOrchestrator
 * 
 * Usage: ts-node examples/test-planner.ts
 */

import { sdPlannerOrchestrator } from '../src/agents/planner/plan-orchestrator';
import { PlannerInputDTO } from '../shared/contracts/plan-schema';
import chalk from 'chalk';

async function testPlanner() {
  console.log(chalk.bold.cyan('\n🧪 Testing sdPlannerOrchestrator\n'));
  console.log(chalk.gray('─'.repeat(60)));

  const orchestrator = new sdPlannerOrchestrator({
    persistOutput: true,
  });

  // Test 1: Simple planning request
  console.log(chalk.blue('\n📋 Test 1: Simple Feature Request'));
  const input1: PlannerInputDTO = {
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
  console.log(chalk.green('✓ Plan created:'), plan1.planId);
  console.log(chalk.white('  Description:'), plan1.description);
  console.log(chalk.white('  Steps:'), plan1.steps.length);
  console.log(chalk.white('  Artifacts:'), plan1.artifacts.length);
  console.log(chalk.white('  Estimated Duration:'), `${plan1.metadata.estimatedDuration}min`);
  console.log(chalk.white('  Priority:'), plan1.metadata.priority);

  // Test 2: Fast track planning
  console.log(chalk.blue('\n📋 Test 2: Fast Track Request'));
  const input2: PlannerInputDTO = {
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
  console.log(chalk.green('✓ Plan created:'), plan2.planId);
  console.log(chalk.white('  Steps:'), plan2.steps.length);
  console.log(chalk.white('  Estimated Duration:'), `${plan2.metadata.estimatedDuration}min`);
  console.log(chalk.white('  Priority:'), plan2.metadata.priority);

  // Test 3: With constraints
  console.log(chalk.blue('\n📋 Test 3: With Time Constraints'));
  const input3: PlannerInputDTO = {
    request: 'Criar dashboard de analytics com gráficos interativos',
    context: {
      techStack: ['React', 'TypeScript', 'Chart.js'],
    },
    constraints: {
      maxDuration: 120, // 2 hours
    },
    metadata: {
      urgency: 'medium',
    },
  };

  const plan3 = orchestrator.createExecutionPlan(input3);
  console.log(chalk.green('✓ Plan created:'), plan3.planId);
  console.log(chalk.white('  Steps:'), plan3.steps.length);
  console.log(chalk.white('  Estimated Duration:'), `${plan3.metadata.estimatedDuration}min`);
  console.log(chalk.white('  Max Duration Constraint:'), '120min');

  // Test system prompt
  console.log(chalk.blue('\n📄 System Prompt'));
  const systemPrompt = orchestrator.getSystemPrompt();
  const promptPreview = systemPrompt.split('\n').slice(0, 5).join('\n');
  console.log(chalk.gray(promptPreview));
  console.log(chalk.gray(`... (${systemPrompt.length} characters total)`));

  console.log(chalk.gray('\n' + '─'.repeat(60)));
  console.log(chalk.green('✓ All tests completed successfully!\n'));
}

// Run tests
testPlanner().catch((error) => {
  console.error(chalk.red('\n❌ Test failed:'), error.message);
  process.exit(1);
});
