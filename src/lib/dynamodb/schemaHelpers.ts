/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Simplified schema helpers for intuitive model definitions
 */

import type { FieldDefinition } from './types'

/**
 * Create a primary key field (hash key with UUID default)
 */
export function primaryKey() {
  return {
    type: String,
    hashKey: true,
    default: () => crypto.randomUUID(),
  } as const
}

/**
 * Create a range key field (sort key)
 */
export function rangeKey<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
>(type: T, defaultValue?: any) {
  return {
    type,
    rangeKey: true,
    ...(defaultValue !== undefined && {
      default:
        typeof defaultValue === 'function' ? defaultValue : () => defaultValue,
    }),
  } as const
}

/**
 * Create a required field
 */
export function required<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
>(type: T) {
  return {
    type,
    required: true,
  } as const
}

/**
 * Create an optional field with default value
 */
export function optional<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
>(type: T, defaultValue: any) {
  return {
    type,
    required: false,
    default:
      typeof defaultValue === 'function' ? defaultValue : () => defaultValue,
  } as const
}

/**
 * Create a timestamp field that defaults to current ISO string
 */
export function timestamp() {
  return {
    type: String,
    required: false,
    default: () => new Date().toISOString(),
  } as const
}

/**
 * Create an updated timestamp field (for future auto-update functionality)
 */
export function updatedTimestamp() {
  return {
    type: String,
    required: false,
    default: () => new Date().toISOString(),
  } as const
}

/**
 * Create a Unix timestamp field (number of milliseconds since epoch)
 */
export function unixTimestamp() {
  return {
    type: Number,
    required: false,
    default: () => Date.now(),
  } as const
}

/**
 * Create a date-only field (YYYY-MM-DD format)
 */
export function dateField() {
  return {
    type: String,
    required: false,
    default: () => new Date().toISOString().split('T')[0],
  } as const
}

/**
 * Create a version field for optimistic locking
 */
export function versionField() {
  return {
    type: Number,
    required: false,
    default: () => 1,
  } as const
}

/**
 * Create a status field with default value
 */
export function statusField(defaultStatus: string = 'active') {
  return {
    type: String,
    required: false,
    default: () => defaultStatus,
  } as const
}

/**
 * Create a user reference field (for audit trails)
 */
export function userField() {
  return {
    type: String,
    required: false,
  } as const
}

/**
 * Common field mixins for reusable patterns
 */
export const fieldMixins = {
  /**
   * Standard ID field (primary key with UUID)
   */
  id: () => primaryKey(),

  /**
   * Standard timestamp fields (ISO strings)
   */
  timestamps: () =>
    ({
      createdAt: timestamp(),
      updatedAt: updatedTimestamp(),
    }) as const,

  /**
   * Unix timestamp fields (numbers)
   */
  unixTimestamps: () =>
    ({
      createdAt: unixTimestamp(),
      updatedAt: unixTimestamp(),
    }) as const,

  /**
   * Soft delete pattern
   */
  softDelete: () =>
    ({
      isDeleted: optional(Boolean, false),
      deletedAt: {
        type: String,
        required: false,
      } as const,
      deletedBy: userField(),
    }) as const,

  /**
   * Audit trail fields (who created/updated)
   */
  auditTrail: () =>
    ({
      createdBy: userField(),
      updatedBy: userField(),
    }) as const,

  /**
   * Version control for optimistic locking
   */
  versioning: () =>
    ({
      version: versionField(),
    }) as const,

  /**
   * Status tracking
   */
  statusTracking: (defaultStatus: string = 'active') =>
    ({
      status: statusField(defaultStatus),
      statusChangedAt: timestamp(),
    }) as const,

  /**
   * Complete audit pattern (timestamps + user tracking + soft delete)
   */
  fullAudit: () =>
    ({
      ...fieldMixins.timestamps(),
      ...fieldMixins.auditTrail(),
      ...fieldMixins.softDelete(),
      ...fieldMixins.versioning(),
    }) as const,
}

/**
 * Helper to create a complete schema with common patterns
 *
 * @param fields - Your custom fields
 * @param options - Common patterns to include
 * @example
 * ```typescript
 * const TodoSchema = schema({
 *   title: required(String),
 *   completed: optional(Boolean, false),
 * }, {
 *   includeId: true,        // Adds id: primaryKey()
 *   includeTimestamps: true, // Adds createdAt, updatedAt
 * });
 * ```
 */
export function schema<T extends Record<string, FieldDefinition>>(
  fields: T,
  options: {
    includeId?: boolean
    includeTimestamps?: boolean
    includeSoftDelete?: boolean
  } = {},
) {
  const {
    includeId = false,
    includeTimestamps = false,
    includeSoftDelete = false,
  } = options

  let result = { ...fields }

  if (includeId) {
    result = { id: fieldMixins.id(), ...result }
  }

  if (includeTimestamps) {
    result = { ...result, ...fieldMixins.timestamps() }
  }

  if (includeSoftDelete) {
    result = { ...result, ...fieldMixins.softDelete() }
  }

  return result
}

/**
 * Create a base model schema with id and timestamps
 * Most common pattern for simple models
 *
 * @param fields - Your custom fields
 * @example
 * ```typescript
 * const TodoSchema = baseModel({
 *   title: required(String),
 *   completed: optional(Boolean, false),
 * });
 * // Automatically includes: id, createdAt, updatedAt
 * ```
 */
export function baseModel<T extends Record<string, FieldDefinition>>(
  fields: T,
) {
  return schema(fields, {
    includeId: true,
    includeTimestamps: true,
  })
}
