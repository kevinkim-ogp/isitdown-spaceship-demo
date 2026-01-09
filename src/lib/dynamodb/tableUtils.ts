/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Table management utilities for DynamoDB
 */

import {
  AttributeDefinition,
  BillingMode,
  CreateTableCommand,
  DescribeTableCommand,
  KeySchemaElement,
  ResourceNotFoundException,
  ScalarAttributeType,
} from '@aws-sdk/client-dynamodb'

import { getDynamoDBClient } from './DDBClient'
import type { FieldDefinition, TableConfig, TableSchema } from './types'

/**
 * Check if a table exists in DynamoDB
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const client = getDynamoDBClient()

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }))
    return true
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false
    }
    throw error
  }
}

/**
 * Get the hash key field from a schema
 */
export function getHashKey<T extends TableSchema>(schema: T): string {
  const hashKeyField = Object.entries(schema).find(
    ([, definition]) => definition.hashKey,
  )
  if (!hashKeyField) {
    throw new Error('Schema must have exactly one hash key field')
  }
  return hashKeyField[0]
}

/**
 * Get the range key field from a schema (if any)
 */
export function getRangeKey<T extends TableSchema>(schema: T): string | null {
  const rangeKeyField = Object.entries(schema).find(
    ([, definition]) => definition.rangeKey,
  )
  return rangeKeyField ? rangeKeyField[0] : null
}

/**
 * Convert our field type to DynamoDB attribute type
 */
function getAttributeType(
  fieldDefinition: FieldDefinition,
): ScalarAttributeType {
  switch (fieldDefinition.type) {
    case String:
      return 'S'
    case Number:
      return 'N'
    case Boolean:
      return 'S' // DynamoDB doesn't support BOOL in key attributes, so we'll use S
    default:
      throw new Error(`Unsupported field type: ${fieldDefinition.type}`)
  }
}

/**
 * Apply default values to an item based on schema
 */
export function applyDefaults<T extends TableSchema>(
  schema: T,
  item: Partial<any>,
): any {
  const result = { ...item }

  for (const [fieldName, definition] of Object.entries(schema)) {
    // Apply default if field is missing and has a default value
    if (!(fieldName in result) && definition.default) {
      result[fieldName] = definition.default()
    }
  }

  return result
}

/**
 * Validate an item against schema
 */
export function validateItem<T extends TableSchema>(
  schema: T,
  item: any,
): void {
  for (const [fieldName, definition] of Object.entries(schema)) {
    const value = item[fieldName]

    // Check required fields
    if (definition.required && (value === undefined || value === null)) {
      throw new Error(`Required field '${fieldName}' is missing`)
    }

    // Check type if value exists
    if (value !== undefined && value !== null) {
      const expectedType = definition.type.name.toLowerCase()
      const actualType = typeof value

      if (expectedType === 'boolean' && actualType !== 'boolean') {
        throw new Error(
          `Field '${fieldName}' must be a boolean, got ${actualType}`,
        )
      }
      if (expectedType === 'string' && actualType !== 'string') {
        throw new Error(
          `Field '${fieldName}' must be a string, got ${actualType}`,
        )
      }
      if (expectedType === 'number' && actualType !== 'number') {
        throw new Error(
          `Field '${fieldName}' must be a number, got ${actualType}`,
        )
      }
    }
  }
}
