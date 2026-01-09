/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Model registry for auto-discovery and initialization
 */

import { config } from '~/models/config'
import { BaseModel } from './BaseModel'
import type { TableSchema } from './types'

export type DatabaseConfig = {
  tableNamePrefix: string
}

// Global registry to track all models
const modelRegistry = new Set<BaseModel<any>>()

/**
 * Register a model for auto-discovery
 */
export function registerModel<T extends TableSchema>(
  model: BaseModel<T>,
): BaseModel<T> {
  modelRegistry.add(model)
  return model
}

/**
 * Get all registered models
 */
export function getAllModels(): BaseModel<any>[] {
  return Array.from(modelRegistry)
}

/**
 * Initialize all registered models (create their tables)
 */
export async function initializeAllModels(): Promise<void> {
  const models = getAllModels()

  if (models.length === 0) {
    console.log('No models found for initialization')
    return
  }

  await Promise.all(
    models.map(async (model) => {
      try {
        await model.createTableIfNotExists()
      } catch (error) {
        console.error(
          `Failed to initialize table ${model._config.tableName}:`,
          error,
        )
      }
    }),
  )
}

/**
 * Initialize all models with error handling
 */
export async function safeInitializeAllModels(): Promise<boolean> {
  try {
    await initializeAllModels()
    return true
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    return false
  }
}

export function getPrefixedTableName(tableName: string): string {
  return config.tableNamePrefix != ''
    ? `${config.tableNamePrefix}__${tableName}`
    : tableName
}
