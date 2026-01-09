/**
 * DynamoDB abstraction exports
 */

// Main model creation functions
export { model, createModel, BaseModel } from './model'

// Query builder for advanced queries
export { QueryBuilder } from './QueryBuilder'

// Auto-discovery and initialization
export {
  registerModel,
  getAllModels,
  initializeAllModels,
  safeInitializeAllModels,
} from './registry'

// Schema helpers for simplified syntax
export {
  primaryKey,
  rangeKey,
  required,
  optional,
  timestamp,
  updatedTimestamp,
  schema,
  baseModel,
  fieldMixins,
} from './schemaHelpers'

// Auto-generated type utilities
export { defineSchema, createTypedSchema } from './typeUtils'
export type { ExtractType, ModelType, SchemaOf } from './typeUtils'

// Core types
export type {
  TableSchema,
  FieldDefinition,
  InferType,
  CreateInput,
  UpdateInput,
  HashKeyType,
  DynamoDBItem,
  ScanOptions,
  QueryOptions,
  UpdateOptions,
  TableConfig,
} from './types'

// Utility functions (for advanced usage)
export {
  tableExists,
  getHashKey,
  getRangeKey,
  applyDefaults,
  validateItem,
} from './tableUtils'

// Re-export client functions
export { getDynamoDBClient, getDynamoDBDocumentClient } from './DDBClient'

// Database initialization
export { initializeDatabase, safeInitializeDatabase } from './init'
