/**
 * sdStateManager - Manages workflow state and context
 * Handles variable storage and context management
 */

export class sdStateManager {
  private context: Record<string, any> = {};
  private variables: Record<string, any> = {};
  private history: Array<{
    timestamp: string;
    action: string;
    data: any;
  }> = [];
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      // Initialize state manager
      this.context = {};
      this.variables = {};
      this.history = [];
      this.isInitialized = true;
      
      console.log('sdStateManager initialized');
    } catch (error) {
      console.error('Failed to initialize sdStateManager:', error);
      throw error;
    }
  }

  setContext(key: string, value: any): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldValue = this.context[key];
    this.context[key] = value;
    
    this.addToHistory('context_set', {
      key,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString(),
    });
  }

  getContext(key?: string): any {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    if (key) {
      return this.context[key];
    }
    
    return { ...this.context };
  }

  deleteContext(key: string): boolean {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    if (key in this.context) {
      const oldValue = this.context[key];
      delete this.context[key];
      
      this.addToHistory('context_deleted', {
        key,
        oldValue,
        timestamp: new Date().toISOString(),
      });
      
      return true;
    }
    
    return false;
  }

  setVariable(name: string, value: any): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldValue = this.variables[name];
    this.variables[name] = value;
    
    this.addToHistory('variable_set', {
      name,
      oldValue,
      newValue: value,
      timestamp: new Date().toISOString(),
    });
  }

  getVariable(name: string): any {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    return this.variables[name];
  }

  getVariables(): Record<string, any> {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    return { ...this.variables };
  }

  deleteVariable(name: string): boolean {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    if (name in this.variables) {
      const oldValue = this.variables[name];
      delete this.variables[name];
      
      this.addToHistory('variable_deleted', {
        name,
        oldValue,
        timestamp: new Date().toISOString(),
      });
      
      return true;
    }
    
    return false;
  }

  updateContext(updates: Record<string, any>): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const changes: Array<{ key: string; oldValue: any; newValue: any }> = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = this.context[key];
      this.context[key] = value;
      changes.push({ key, oldValue, newValue: value });
    }
    
    this.addToHistory('context_batch_update', {
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  mergeContext(additionalContext: Record<string, any>): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const mergedContext = { ...this.context, ...additionalContext };
    const changes: Array<{ key: string; oldValue: any; newValue: any }> = [];
    
    for (const [key, value] of Object.entries(mergedContext)) {
      const oldValue = this.context[key];
      if (oldValue !== value) {
        this.context[key] = value;
        changes.push({ key, oldValue, newValue: value });
      }
    }
    
    this.addToHistory('context_merge', {
      additionalContext,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  clearContext(): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldContext = { ...this.context };
    this.context = {};
    
    this.addToHistory('context_cleared', {
      oldContext,
      timestamp: new Date().toISOString(),
    });
  }

  clearVariables(): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldVariables = { ...this.variables };
    this.variables = {};
    
    this.addToHistory('variables_cleared', {
      oldVariables,
      timestamp: new Date().toISOString(),
    });
  }

  reset(): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldContext = { ...this.context };
    const oldVariables = { ...this.variables };
    
    this.context = {};
    this.variables = {};
    
    this.addToHistory('state_reset', {
      oldContext,
      oldVariables,
      timestamp: new Date().toISOString(),
    });
  }

  restoreContext(context: Record<string, any>): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldContext = { ...this.context };
    this.context = { ...context };
    
    this.addToHistory('context_restored', {
      oldContext,
      newContext: { ...context },
      timestamp: new Date().toISOString(),
    });
  }

  setVariables(variables: Record<string, any>): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const oldVariables = { ...this.variables };
    this.variables = { ...variables };
    
    this.addToHistory('variables_set', {
      oldVariables,
      newVariables: { ...variables },
      timestamp: new Date().toISOString(),
    });
  }

  getState(): {
    context: Record<string, any>;
    variables: Record<string, any>;
    historyCount: number;
    lastUpdated: string;
  } {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const lastHistoryEntry = this.history[this.history.length - 1];
    
    return {
      context: { ...this.context },
      variables: { ...this.variables },
      historyCount: this.history.length,
      lastUpdated: lastHistoryEntry?.timestamp || new Date().toISOString(),
    };
  }

  getHistory(limit?: number): Array<{
    timestamp: string;
    action: string;
    data: any;
  }> {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    if (limit && limit > 0) {
      return this.history.slice(-limit);
    }
    
    return [...this.history];
  }

  clearHistory(): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    this.history = [];
    this.addToHistory('history_cleared', {
      timestamp: new Date().toISOString(),
    });
  }

  exportState(): string {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    const state = {
      context: this.context,
      variables: this.variables,
      history: this.history,
      exportedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(state, null, 2);
  }

  importState(stateJson: string): void {
    if (!this.isInitialized) {
      throw new Error('sdStateManager not initialized');
    }

    try {
      const state = JSON.parse(stateJson);
      
      if (state.context) {
        this.restoreContext(state.context);
      }
      
      if (state.variables) {
        this.setVariables(state.variables);
      }
      
      if (state.history) {
        this.history = [...state.history];
      }
      
      this.addToHistory('state_imported', {
        importedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to import state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateState(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isInitialized) {
      errors.push('State manager not initialized');
    }

    // Check for circular references in context
    try {
      JSON.stringify(this.context);
    } catch (error) {
      errors.push('Context contains circular references');
    }

    // Check for circular references in variables
    try {
      JSON.stringify(this.variables);
    } catch (error) {
      errors.push('Variables contain circular references');
    }

    // Check history size
    if (this.history.length > 10000) {
      warnings.push('History is very large and may affect performance');
    }

    // Check for large objects
    const contextSize = JSON.stringify(this.context).length;
    const variablesSize = JSON.stringify(this.variables).length;
    
    if (contextSize > 1000000) { // 1MB
      warnings.push('Context is very large and may affect performance');
    }
    
    if (variablesSize > 1000000) { // 1MB
      warnings.push('Variables are very large and may affect performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private addToHistory(action: string, data: any): void {
    this.history.push({
      timestamp: new Date().toISOString(),
      action,
      data,
    });

    // Limit history size to prevent memory issues
    if (this.history.length > 10000) {
      this.history = this.history.slice(-5000); // Keep last 5000 entries
    }
  }

  async cleanup(): Promise<void> {
    this.context = {};
    this.variables = {};
    this.history = [];
    this.isInitialized = false;
    
    console.log('sdStateManager cleaned up');
  }
}