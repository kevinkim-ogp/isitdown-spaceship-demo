/**
 * Database initialization - Auto-discovery version
 *
 * This file automatically discovers and initializes all models defined in lib/models.
 * No need to manually define schemas here - just import the models and they're auto-registered!
 */

// Import all models to register them (this is the magic!)
import '~/models' // This imports lib/models/index.ts which registers all models

// Import the auto-discovery functions
import { initializeAllModels, safeInitializeAllModels } from './registry'

/**
 * Initialize all discovered models
 * This will automatically create tables for all models in lib/models/
 */
export async function initializeDatabase(): Promise<void> {
  await initializeAllModels()
}

/**
 * Initialize database with error handling
 */
export async function safeInitializeDatabase(): Promise<boolean> {
  try {
    await initializeDatabase()
    return true
  } catch (error) {
    console.error('Failed to initialize database:', error)
    return false
  }
}

// Re-export for convenience
export { initializeAllModels, safeInitializeAllModels }
