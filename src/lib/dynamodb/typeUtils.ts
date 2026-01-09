/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Auto-generated type utilities
 * Eliminates the need for manual type definitions
 */

import type { InferType, TableSchema } from './types'

/**
 * Extract the TypeScript type from a schema automatically
 * Use this instead of manually defining types
 *
 * @example
 * ```typescript
 * const TodoSchema = schema({ ... });
 * export type TodoItem = ExtractType<typeof TodoSchema>;
 * ```
 */
export type ExtractType<T extends TableSchema> = InferType<T>

/**
 * Helper to auto-generate types and export them
 * Returns both the schema and the inferred type
 */
export function defineSchema<T extends TableSchema>(schema: T) {
  return {
    schema,
    // Type utility for extracting the inferred type
    // Usage: const TodoType = TodoSchema.Type;
    Type: null as any as InferType<T>,
  }
}

/**
 * Type-only export helper for cleaner exports
 * Automatically generates the correct type name
 */
export type ModelType<T extends TableSchema> = InferType<T>

/**
 * Helper to get the schema type for external use
 */
export type SchemaOf<T extends TableSchema> = T

/**
 * Utility to create a strongly-typed model definition
 * with auto-generated types
 */
export function createTypedSchema<
  TName extends string,
  TSchema extends TableSchema,
>(name: TName, schema: TSchema) {
  return {
    name,
    schema,
    // Auto-generated type helpers
    Type: null as any as InferType<TSchema>,
    Schema: null as any as TSchema,
  }
}
