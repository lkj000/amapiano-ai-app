/**
 * AURA-X Core Service Implementation
 * 
 * The core orchestrator for the AURA-X ecosystem specialized for Amapiano AI Platform.
 * Manages module coordination, cultural context, and system lifecycle.
 */

import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { 
  AuraXConfig, 
  AuraXContext, 
  IAuraXService, 
  IAuraXModule, 
  AuraXEvent, 
  AuraXMessage,
  DefaultAuraXConfig,
  AuraXError
} from './types';

export class AuraXCore implements IAuraXService {
  private config: AuraXConfig;
  private context: AuraXContext;
  private modules: Map<string, IAuraXModule>;
  private eventBus: AuraXEventBus;
  private messageQueue: AuraXMessageQueue;
  private initialized: boolean = false;

  constructor() {
    this.config = { ...DefaultAuraXConfig };
    this.modules = new Map();
    this.eventBus = new AuraXEventBus();
    this.messageQueue = new AuraXMessageQueue();
    
    // Initialize default context
    this.context = {
      culture: {
        region: 'south_africa',
        musicGenre: 'amapiano',
        authenticity: 'traditional',
        language: 'english',
      },
      user: {
        id: 'anonymous',
        role: 'student',
        skillLevel: 'beginner',
        preferences: {},
      },
      session: {
        sessionId: `aura_x_${Date.now()}`,
        currentContext: 'generation',
      },
    };
  }

  async initialize(config: AuraXConfig): Promise<void> {
    try {
      log.info("Initializing AURA-X Core", { 
        version: config.core.version,
        environment: config.core.environment,
        culturalContext: config.core.culturalContext
      });

      // Merge provided config with defaults
      this.config = { ...this.config, ...config };
      
      // Initialize event bus
      await this.eventBus.initialize();
      
      // Initialize message queue
      await this.messageQueue.initialize();
      
      // Register core event handlers
      this.registerCoreEventHandlers();
      
      // Emit initialization event
      await this.eventBus.emit({
        type: 'aura_x_initialized',
        source: 'core',
        timestamp: new Date(),
        context: this.context,
        data: { config: this.config }
      });

      this.initialized = true;
      
      log.info("AURA-X Core initialized successfully", {
        modules: this.modules.size,
        culturalContext: this.config.core.culturalContext
      });

    } catch (error) {
      log.error("Failed to initialize AURA-X Core", { error: (error as Error).message });
      throw new AuraXError({
        code: 'INITIALIZATION_FAILED',
        message: 'Failed to initialize AURA-X Core',
        severity: 'critical',
        suggestions: ['Check configuration', 'Verify dependencies', 'Check cultural context settings']
      });
    }
  }

  getContext(): AuraXContext {
    return { ...this.context };
  }

  updateContext(contextUpdate: Partial<AuraXContext>): void {
    const previousContext = { ...this.context };
    
    // Deep merge context update
    this.context = {
      ...this.context,
      ...contextUpdate,
      culture: { ...this.context.culture, ...contextUpdate.culture },
      user: { ...this.context.user, ...contextUpdate.user },
      session: { ...this.context.session, ...contextUpdate.session },
    };

    // Emit context change event
    this.eventBus.emit({
      type: 'context_updated',
      source: 'core',
      timestamp: new Date(),
      context: this.context,
      data: { 
        previous: previousContext,
        current: this.context,
        changes: contextUpdate
      }
    });

    log.info("AURA-X context updated", {
      sessionId: this.context.session.sessionId,
      culturalContext: this.context.culture,
      userRole: this.context.user.role
    });
  }

  async registerModule(module: IAuraXModule): Promise<void> {
    try {
      if (this.modules.has(module.name)) {
        throw new AuraXError({
          code: 'MODULE_ALREADY_REGISTERED',
          message: `Module ${module.name} is already registered`,
          severity: 'medium',
          suggestions: ['Use different module name', 'Unregister existing module first']
        });
      }

      // Verify dependencies
      for (const dependency of module.dependencies) {
        if (!this.modules.has(dependency)) {
          throw new AuraXError({
            code: 'DEPENDENCY_NOT_FOUND',
            message: `Dependency ${dependency} not found for module ${module.name}`,
            severity: 'high',
            suggestions: [`Register ${dependency} module first`, 'Check module dependencies']
          });
        }
      }

      // Initialize module with current context
      await module.initialize(this.context);
      
      // Register module
      this.modules.set(module.name, module);

      // Emit module registration event
      await this.eventBus.emit({
        type: 'module_registered',
        source: 'core',
        timestamp: new Date(),
        context: this.context,
        data: { 
          moduleName: module.name,
          version: module.version,
          dependencies: module.dependencies
        }
      });

      log.info("AURA-X module registered", {
        module: module.name,
        version: module.version,
        dependencies: module.dependencies
      });

    } catch (error) {
      log.error("Failed to register AURA-X module", { 
        module: module.name,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  async unregisterModule(moduleName: string): Promise<void> {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new AuraXError({
        code: 'MODULE_NOT_FOUND',
        message: `Module ${moduleName} not found`,
        severity: 'medium',
        suggestions: ['Check module name spelling', 'Verify module is registered']
      });
    }

    try {
      // Check for dependent modules
      const dependentModules = Array.from(this.modules.values())
        .filter(m => m.dependencies.includes(moduleName));
      
      if (dependentModules.length > 0) {
        throw new AuraXError({
          code: 'MODULE_HAS_DEPENDENTS',
          message: `Cannot unregister ${moduleName}: has dependent modules`,
          severity: 'high',
          suggestions: [
            'Unregister dependent modules first',
            `Dependent modules: ${dependentModules.map(m => m.name).join(', ')}`
          ]
        });
      }

      // Cleanup module
      await module.cleanup();
      
      // Remove from registry
      this.modules.delete(moduleName);

      // Emit unregistration event
      await this.eventBus.emit({
        type: 'module_unregistered',
        source: 'core',
        timestamp: new Date(),
        context: this.context,
        data: { moduleName }
      });

      log.info("AURA-X module unregistered", { module: moduleName });

    } catch (error) {
      log.error("Failed to unregister AURA-X module", { 
        module: moduleName,
        error: (error as Error).message 
      });
      throw error;
    }
  }

  async executeModuleOperation(
    moduleName: string, 
    operation: string, 
    data: any
  ): Promise<any> {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new AuraXError({
        code: 'MODULE_NOT_FOUND',
        message: `Module ${moduleName} not found`,
        severity: 'high',
        suggestions: ['Check module name', 'Register module first', 'Verify module availability']
      });
    }

    try {
      // Emit operation start event
      await this.eventBus.emit({
        type: 'module_operation_start',
        source: moduleName,
        timestamp: new Date(),
        context: this.context,
        data: { operation, inputData: data }
      });

      // Execute operation
      const result = await module.execute(operation, data);

      // Emit operation complete event
      await this.eventBus.emit({
        type: 'module_operation_complete',
        source: moduleName,
        timestamp: new Date(),
        context: this.context,
        data: { operation, result }
      });

      log.info("AURA-X module operation completed", {
        module: moduleName,
        operation,
        success: true
      });

      return result;

    } catch (error) {
      // Emit operation error event
      await this.eventBus.emit({
        type: 'module_operation_error',
        source: moduleName,
        timestamp: new Date(),
        context: this.context,
        data: { 
          operation, 
          error: (error as Error).message,
          culturalContext: this.context.culture
        }
      });

      log.error("AURA-X module operation failed", {
        module: moduleName,
        operation,
        error: (error as Error).message
      });

      throw error;
    }
  }

  async getModuleInfo(moduleName: string): Promise<any> {
    const module = this.modules.get(moduleName);
    if (!module) {
      return null;
    }

    return {
      name: module.name,
      version: module.version,
      dependencies: module.dependencies,
      status: 'active',
      culturalContext: this.context.culture
    };
  }

  async listModules(): Promise<any[]> {
    return Array.from(this.modules.values()).map(module => ({
      name: module.name,
      version: module.version,
      dependencies: module.dependencies,
      status: 'active'
    }));
  }

  async validateCulturalContext(operation: string, data: any): Promise<boolean> {
    // Check if cultural validation is enabled
    if (!this.config.core.authenticity.enabled) {
      return true;
    }

    try {
      // Get cultural validator module if available
      const culturalValidator = this.modules.get('cultural_validator');
      if (culturalValidator) {
        return await culturalValidator.validate(data);
      }

      // Basic cultural context validation
      const culturalElements = ['traditional', 'modern', 'fusion'];
      return culturalElements.includes(this.context.culture.authenticity);

    } catch (error) {
      log.warn("Cultural validation failed", {
        operation,
        error: (error as Error).message,
        culturalContext: this.context.culture
      });
      
      // Fail open or closed based on configuration
      return this.config.core.authenticity.strictness !== 'expert';
    }
  }

  async sendMessage(message: AuraXMessage): Promise<void> {
    await this.messageQueue.send(message);
  }

  async receiveMessages(recipient: string): Promise<AuraXMessage[]> {
    return await this.messageQueue.receive(recipient);
  }

  async subscribeToEvents(eventType: string, handler: (event: AuraXEvent) => void): Promise<void> {
    this.eventBus.subscribe(eventType, handler);
  }

  async emitEvent(event: AuraXEvent): Promise<void> {
    await this.eventBus.emit(event);
  }

  async shutdown(): Promise<void> {
    try {
      log.info("Shutting down AURA-X Core");

      // Emit shutdown event
      await this.eventBus.emit({
        type: 'aura_x_shutdown',
        source: 'core',
        timestamp: new Date(),
        context: this.context,
        data: { reason: 'manual_shutdown' }
      });

      // Cleanup all modules
      for (const [name, module] of this.modules) {
        try {
          await module.cleanup();
          log.info("Module cleaned up", { module: name });
        } catch (error) {
          log.error("Failed to cleanup module", { 
            module: name,
            error: (error as Error).message 
          });
        }
      }

      // Clear modules
      this.modules.clear();

      // Shutdown event bus and message queue
      await this.eventBus.shutdown();
      await this.messageQueue.shutdown();

      this.initialized = false;

      log.info("AURA-X Core shutdown complete");

    } catch (error) {
      log.error("Error during AURA-X shutdown", { error: (error as Error).message });
      throw error;
    }
  }

  private registerCoreEventHandlers(): void {
    // Handle context changes
    this.eventBus.subscribe('context_updated', async (event: AuraXEvent) => {
      // Notify all modules of context change
      for (const [name, module] of this.modules) {
        try {
          if (typeof (module as any).onContextChange === 'function') {
            await (module as any).onContextChange(event.context);
          }
        } catch (error) {
          log.error("Module failed to handle context change", {
            module: name,
            error: (error as Error).message
          });
        }
      }
    });

    // Handle module errors
    this.eventBus.subscribe('module_operation_error', async (event: AuraXEvent) => {
      log.error("Module operation error detected", {
        source: event.source,
        data: event.data,
        culturalContext: event.context?.culture
      });

      // Implement recovery strategies based on cultural context
      if (event.data.culturalContext) {
        await this.handleCulturalError(event);
      }
    });
  }

  private async handleCulturalError(event: AuraXEvent): Promise<void> {
    // Implement cultural-aware error handling
    const culturalContext = event.context?.culture;
    if (!culturalContext) return;

    // Log cultural context for expert review
    log.warn("Cultural context error", {
      source: event.source,
      operation: event.data.operation,
      culturalContext,
      error: event.data.error
    });

    // If expert validation is enabled, flag for review
    if (this.config.core.authenticity.expertValidation) {
      await this.flagForExpertReview(event);
    }
  }

  private async flagForExpertReview(event: AuraXEvent): Promise<void> {
    // Implementation for flagging cultural issues for expert review
    await this.eventBus.emit({
      type: 'expert_review_required',
      source: 'core',
      timestamp: new Date(),
      context: event.context,
      data: {
        originalEvent: event,
        reviewReason: 'cultural_context_error',
        priority: 'high'
      }
    });
  }

  // Getters for configuration and status
  getConfig(): AuraXConfig {
    return { ...this.config };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getModuleCount(): number {
    return this.modules.size;
  }

  getCulturalContext(): AuraXContext['culture'] {
    return { ...this.context.culture };
  }
}

// Event Bus Implementation
class AuraXEventBus {
  private handlers: Map<string, ((event: AuraXEvent) => void)[]>;
  private eventHistory: AuraXEvent[];
  private maxHistorySize: number = 1000;

  constructor() {
    this.handlers = new Map();
    this.eventHistory = [];
  }

  async initialize(): Promise<void> {
    log.info("AURA-X Event Bus initialized");
  }

  subscribe(eventType: string, handler: (event: AuraXEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: (event: AuraXEvent) => void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async emit(event: AuraXEvent): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify handlers
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        log.error("Event handler error", {
          eventType: event.type,
          error: (error as Error).message
        });
      }
    }
  }

  getEventHistory(eventType?: string): AuraXEvent[] {
    if (eventType) {
      return this.eventHistory.filter(e => e.type === eventType);
    }
    return [...this.eventHistory];
  }

  async shutdown(): Promise<void> {
    this.handlers.clear();
    this.eventHistory = [];
    log.info("AURA-X Event Bus shutdown");
  }
}

// Message Queue Implementation
class AuraXMessageQueue {
  private queues: Map<string, AuraXMessage[]>;
  private maxQueueSize: number = 100;

  constructor() {
    this.queues = new Map();
  }

  async initialize(): Promise<void> {
    log.info("AURA-X Message Queue initialized");
  }

  async send(message: AuraXMessage): Promise<void> {
    const recipientQueue = this.queues.get(message.recipient) || [];
    recipientQueue.push(message);
    
    // Limit queue size
    if (recipientQueue.length > this.maxQueueSize) {
      recipientQueue.shift();
    }
    
    this.queues.set(message.recipient, recipientQueue);
  }

  async receive(recipient: string): Promise<AuraXMessage[]> {
    const messages = this.queues.get(recipient) || [];
    this.queues.set(recipient, []); // Clear queue after reading
    return messages;
  }

  async shutdown(): Promise<void> {
    this.queues.clear();
    log.info("AURA-X Message Queue shutdown");
  }
}

// Export singleton instance
export const auraXCore = new AuraXCore();