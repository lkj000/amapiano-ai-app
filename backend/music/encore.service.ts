import { Service } from "encore.dev/service";
import { auraXCore } from "./aura-x/core";
import { AuraXCulturalValidator } from "./aura-x/cultural-validator";
import { AuraXAIOrchestrator } from "./aura-x/ai-orchestrator";
import { AuraXEducationalFramework } from "./aura-x/educational-framework";
import { DefaultAuraXConfig } from "./aura-x/types";
import log from "encore.dev/log";

export default new Service("music");

// Initialize AURA-X ecosystem on service startup
async function initializeAuraX() {
  try {
    log.info("🌟 Initializing AURA-X - The Invisible Intelligence Layer");
    
    // Initialize AURA-X Core with production configuration
    await auraXCore.initialize({
      ...DefaultAuraXConfig,
      core: {
        ...DefaultAuraXConfig.core,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      }
    });
    
    // Register Cultural Validation Module
    const culturalValidator = new AuraXCulturalValidator();
    await auraXCore.registerModule(culturalValidator);
    log.info("✅ Cultural Validator registered - Cultural authenticity enabled");
    
    // Register AI Orchestration Module
    const aiOrchestrator = new AuraXAIOrchestrator();
    await auraXCore.registerModule(aiOrchestrator);
    log.info("✅ AI Orchestrator registered - Multi-model coordination enabled");
    
    // Register Educational Framework Module
    const educationalFramework = new AuraXEducationalFramework();
    await auraXCore.registerModule(educationalFramework);
    log.info("✅ Educational Framework registered - Adaptive learning enabled");
    
    log.info("🎉 AURA-X ecosystem fully initialized and powering the Amapiano AI Platform");
    log.info("   - Cultural Intelligence: ACTIVE");
    log.info("   - AI Orchestration: ACTIVE");
    log.info("   - Educational Framework: ACTIVE");
    
  } catch (error) {
    log.error("❌ Failed to initialize AURA-X ecosystem", { 
      error: (error as Error).message 
    });
    // Don't throw - allow platform to start without AURA-X but log the issue
  }
}

// Initialize AURA-X when the service starts
initializeAuraX().catch(err => {
  log.error("AURA-X initialization error", { error: err });
});

// Export AURA-X core for use in other modules
export { auraXCore };
