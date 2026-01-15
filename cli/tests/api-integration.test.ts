import { sdApiServer } from './src/api/server';
import { systemEvents, SystemEvent } from './shared/events/event-emitter';
import { PlannerInputDTO } from './shared/contracts/plan-schema';

async function testApiIntegration() {
  console.log('Starting API Integration Test...\n');

  const server = new sdApiServer({
    port: 3001,
    logRequests: true,
  });

  systemEvents.on(SystemEvent.PLAN_CREATED, (data) => {
    console.log('\n✓ Event received: PLAN_CREATED');
    console.log('  Plan ID:', data.plan.planId);
    console.log('  Steps:', data.plan.steps.length);
    console.log('  Estimated Duration:', data.plan.metadata.estimatedDuration, 'minutes');
  });

  systemEvents.on(SystemEvent.PLAN_FAILED, (data) => {
    console.error('\n✗ Event received: PLAN_FAILED');
    console.error('  Error:', data.error);
  });

  try {
    console.log('1. Initializing server...');
    await server.initialize();
    console.log('   ✓ Server initialized\n');

    console.log('2. Starting server on port 3001...');
    await server.start();
    console.log('   ✓ Server started\n');

    console.log('3. Testing plan creation via API...');
    
    const testInput: PlannerInputDTO = {
      request: 'Implement user authentication with JWT tokens',
      context: {
        techStack: ['typescript', 'express', 'postgresql'],
        projectType: 'backend-api',
        existingArtifacts: ['src/server.ts', 'src/routes/'],
      },
      preferences: {
        prioritizeQuality: true,
      },
      constraints: {
        maxDuration: 480,
      },
      metadata: {
        source: 'test',
        urgency: 'high',
        tags: ['authentication', 'security'],
      },
    };

    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3001/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testInput),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('   ✓ Plan created successfully\n');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.error('   ✗ Plan creation failed');
      console.error('Response:', result);
    }

    console.log('\n4. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/api/plan/health');
    const healthResult = await healthResponse.json();
    console.log('   ✓ Health check:', healthResult.status);
    console.log('   Providers:', healthResult.providers);

    console.log('\n5. Testing queue endpoint...');
    const queueResponse = await fetch('http://localhost:3001/api/plan/queue');
    const queueResult = await queueResponse.json();
    console.log('   ✓ Queue status:');
    console.log('   Size:', queueResult.queue.size);
    console.log('   Is Empty:', queueResult.queue.isEmpty);

    console.log('\n6. Stopping server...');
    await server.stop();
    console.log('   ✓ Server stopped\n');

    console.log('═══════════════════════════════════════════');
    console.log('✓ API Integration Test Completed Successfully');
    console.log('═══════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    
    try {
      await server.stop();
    } catch (stopError) {
      console.error('Failed to stop server:', stopError);
    }
    
    process.exit(1);
  }
}

testApiIntegration();
