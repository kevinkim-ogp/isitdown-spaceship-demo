/**
 * TodoItem model - Type-safe DynamoDB abstraction with simplified syntax
 */

import { createModel } from '~/lib/dynamodb/model'
import { optional, primaryKey, required } from '~/lib/dynamodb/schemaHelpers'
import type { ExtractType } from '~/lib/dynamodb/typeUtils'

// Define the TodoItem schema using simplified helpers
const TodoItemSchema = {
  id: primaryKey(), // Auto-generates UUID, sets as hash key
  title: required(String), // Required string field
  completed: optional(Boolean, false), // Optional with default value
} as const

// Create the model instance
const TodoItem = createModel(TodoItemSchema, 'TodoItems')

export default TodoItem

// Export the schema for external use
export type TodoItemSchema = typeof TodoItemSchema

// Auto-generated TypeScript type - no manual definition needed!
export type TodoItemData = ExtractType<typeof TodoItemSchema>
