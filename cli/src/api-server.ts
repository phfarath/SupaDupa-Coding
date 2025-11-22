#!/usr/bin/env node

import { startApiServer } from './api/server';
import { systemEvents, SystemEvent } from '../shared/events/event-emitter';

async function main() {
  try {
    console.log('Starting SupaDupa-Coding API Server...');

    systemEvents.on(SystemEvent.PLAN_CREATED, (data) => {
      console.log('✓ Plan created:', data.plan.planId);
    });

    systemEvents.on(SystemEvent.PLAN_FAILED, (data) => {
      console.error('✗ Plan creation failed:', data.error);
    });

    const server = await startApiServer();

    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

main();
