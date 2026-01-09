/**
 * Model factory function - Creates type-safe DynamoDB models
 */

import { BaseModel } from './BaseModel'
import { registerModel } from './registry'
import type { TableConfig, TableSchema } from './types'

/**
 * Create a DynamoDB model with type safety
 *
 * @param schema - The table schema definition
 * @param config - Table configuration (name, billing mode, etc.)
 * @returns A type-safe model instance
 *
 * @example
 * ```typescript
 * const TodoItemSchema = {
 *   id: {
 *     type: String,
 *     hashKey: true,
 *     default: () => crypto.randomUUID()
 *   },
 *   title: {
 *     type: String,
 *     required: true
 *   },
 *   completed: {
 *     type: Boolean,
 *     required: true,
 *     default: () => false,
 *   },
 * };
 *
 * const TodoItem = model(TodoItemSchema, { tableName: 'TodoItems' });
 *
 * // Usage:
 * const todos = await TodoItem.scan();
 * const todo = await TodoItem.get('some-id');
 * ```
 */
export function model<T extends TableSchema>(
  schema: T,
  config: TableConfig,
): BaseModel<T> {
  const modelInstance = new BaseModel(schema, config)
  return registerModel(modelInstance)
}

/**
 * Convenience function to create a model with just a table name
 * Uses default configuration (PAY_PER_REQUEST billing)
 */
export function createModel<T extends TableSchema>(
  schema: T,
  tableName: string,
): BaseModel<T> {
  return model(schema, {
    tableName,
    billingMode: 'PAY_PER_REQUEST',
  })
}

// Re-export types for convenience
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

// Re-export BaseModel for advanced usage
export { BaseModel } from './BaseModel'
