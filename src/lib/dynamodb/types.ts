/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

/**
 * Core type definitions for type-safe DynamoDB abstraction
 */

// Supported field types
export type FieldType =
  | StringConstructor
  | BooleanConstructor
  | NumberConstructor

// Field definition interface
export interface FieldDefinition {
  type: FieldType
  hashKey?: boolean
  rangeKey?: boolean
  required?: boolean
  default?: () => any
}

// Table schema type
export type TableSchema = Record<string, FieldDefinition>

// Type inference utility - converts schema to TypeScript type
export type InferType<T extends TableSchema> = {
  [K in keyof T]: T[K]['type'] extends StringConstructor
    ? string
    : T[K]['type'] extends BooleanConstructor
      ? boolean
      : T[K]['type'] extends NumberConstructor
        ? number
        : never
}

// Utility type to get required fields (required=true AND no default)
export type RequiredFields<T extends TableSchema> = {
  [K in keyof T]: T[K]['required'] extends true
    ? T[K]['default'] extends Function
      ? never
      : K
    : never
}[keyof T]

// Utility type to get optional fields (not required OR has default)
export type OptionalFields<T extends TableSchema> = {
  [K in keyof T]: T[K]['required'] extends true
    ? T[K]['default'] extends Function
      ? K
      : never
    : K
}[keyof T]

// Input type for create operations (required fields must be provided, optional can be omitted)
export type CreateInput<T extends TableSchema> = {
  [K in RequiredFields<T>]: InferType<T>[K]
} & {
  [K in OptionalFields<T>]?: InferType<T>[K]
}

// Update input type (all fields optional for updates)
export type UpdateInput<T extends TableSchema> = Partial<InferType<T>>

// Key type for hash key access
export type HashKeyType<T extends TableSchema> = {
  [K in keyof T]: T[K]['hashKey'] extends true ? InferType<T>[K] : never
}[keyof T]

// DynamoDB item type with metadata
export interface DynamoDBItem<T = any> {
  item: T
  consumed?: number
  scannedCount?: number
  lastEvaluatedKey?: Record<string, any>
}

// Scan options
export interface ScanOptions {
  limit?: number
  exclusiveStartKey?: Record<string, any>
  filterExpression?: string
  expressionAttributeNames?: Record<string, string>
  expressionAttributeValues?: Record<string, any>
}

// Query options
export interface QueryOptions {
  limit?: number
  exclusiveStartKey?: Record<string, any>
  keyConditionExpression?: string
  filterExpression?: string
  expressionAttributeNames?: Record<string, string>
  expressionAttributeValues?: Record<string, any>
  scanIndexForward?: boolean
}

// Update options
export interface UpdateOptions {
  updateExpression?: string
  conditionExpression?: string
  expressionAttributeNames?: Record<string, string>
  expressionAttributeValues?: Record<string, any>
  returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
}

// Table configuration
export interface TableConfig {
  tableName: string
  readCapacityUnits?: number
  writeCapacityUnits?: number
  billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED'
}
