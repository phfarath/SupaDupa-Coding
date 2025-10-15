/**
 * API Event Constants for SupaDupaCode CLI
 */

export const SD_API_EVENTS = {
  EVENT_PLAN_CREATED: 'api:plan:created',
  EVENT_BUILD_READY: 'api:build:ready',
  EVENT_TEST_COMPLETED: 'api:test:completed',
  EVENT_DEPLOYMENT_STARTED: 'api:deployment:started',
  EVENT_DEPLOYMENT_COMPLETED: 'api:deployment:completed',
  EVENT_ERROR_OCCURRED: 'api:error:occurred'
};

export const SD_EVENT_PLAN_CREATED = SD_API_EVENTS.EVENT_PLAN_CREATED;
export const SD_EVENT_BUILD_READY = SD_API_EVENTS.EVENT_BUILD_READY;
export const SD_EVENT_TEST_COMPLETED = SD_API_EVENTS.EVENT_TEST_COMPLETED;
