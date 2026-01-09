/**
 * Models exports - Auto-discovery enabled
 */

// Import all models (this registers them automatically)
export { default as TodoItem } from './TodoItem'
export type { TodoItemSchema, TodoItemData } from './TodoItem'
export { default as VerificationToken } from './VerificationToken'
export { default as User } from './User'
export type { UserData } from './User'
export { default as ServiceReport } from './ServiceReport'
export type { ServiceReportData } from './ServiceReport'

// Re-export initialization functions for convenience
export {
  initializeAllModels,
  safeInitializeAllModels,
} from '~/lib/dynamodb/registry'
