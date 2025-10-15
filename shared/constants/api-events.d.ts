/**
 * @const SD_API_EVENTS
 * @description Constants for API-related events used for synchronization across modules.
 */
export declare const SD_API_EVENTS: {
    /**
     * Fired when the Planner Agent has successfully created a new execution plan.
     * @type {string}
     */
    SD_EVENT_PLAN_CREATED: string;
    /**
     * Fired when the Coder Agent has finished a build and the artifacts are ready.
     * @type {string}
     */
    SD_EVENT_BUILD_READY: string;
    /**
     * Fired when the QA Agent has completed its testing run.
     * @type {string}
     */
    SD_EVENT_TEST_COMPLETED: string;
};
//# sourceMappingURL=api-events.d.ts.map