// cli/shared/constants/api-events.ts

/**
 * @const SD_API_EVENTS
 * @description Constants for API-related events used for synchronization across modules.
 */
export const SD_API_EVENTS = {
  /**
   * Fired when the Planner Agent has successfully created a new execution plan.
   * @type {string}
   */
  EVENT_PLAN_CREATED: 'SD_EVENT_PLAN_CREATED',

  /**
   * Fired when the Coder Agent has finished a build and the artifacts are ready.
   * @type {string}
   */
  EVENT_BUILD_READY: 'SD_EVENT_BUILD_READY',

  /**
   * Fired when the QA Agent has completed its testing run.
   * @type {string}
   */
  EVENT_TEST_COMPLETED: 'SD_EVENT_TEST_COMPLETED',

  /**
   * Fired when an agent is initialized.
   * @type {string}
   */
  EVENT_AGENT_INITIALIZED: 'SD_EVENT_AGENT_INITIALIZED',

  /**
   * Fired when an agent encounters an error.
   * @type {string}
   */
  EVENT_AGENT_ERROR: 'SD_EVENT_AGENT_ERROR',

  /**
   * Fired when a task is started by an agent.
   * @type {string}
   */
  EVENT_TASK_STARTED: 'SD_EVENT_TASK_STARTED',

  /**
   * Fired when a task is completed by an agent.
   * @type {string}
   */
  EVENT_TASK_COMPLETED: 'SD_EVENT_TASK_COMPLETED',

  /**
   * Fired when a task fails.
   * @type {string}
   */
  EVENT_TASK_FAILED: 'SD_EVENT_TASK_FAILED',

  /**
   * Fired when a provider is registered.
   * @type {string}
   */
  EVENT_PROVIDER_REGISTERED: 'SD_EVENT_PROVIDER_REGISTERED',

  /**
   * Fired when a provider is unregistered.
   * @type {string}
   */
  EVENT_PROVIDER_UNREGISTERED: 'SD_EVENT_PROVIDER_UNREGISTERED',

  /**
   * Fired when a provider executes a request.
   * @type {string}
   */
  EVENT_PROVIDER_EXECUTED: 'SD_EVENT_PROVIDER_EXECUTED',

  /**
   * Fired when a provider encounters an error.
   * @type {string}
   */
  EVENT_PROVIDER_ERROR: 'SD_EVENT_PROVIDER_ERROR',

  /**
   * Fired when the registry is cleared.
   * @type {string}
   */
  EVENT_REGISTRY_CLEARED: 'SD_EVENT_REGISTRY_CLEARED'
};