/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * BaseModel class - Core abstraction for DynamoDB operations
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
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  ScanCommandInput,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'

import { getDynamoDBClient, getDynamoDBDocumentClient } from './DDBClient'
import { QueryBuilder } from './QueryBuilder'
import { getPrefixedTableName } from './registry'
import {
  applyDefaults,
  getHashKey,
  getRangeKey,
  validateItem,
} from './tableUtils'
import type {
  CreateInput,
  DynamoDBItem,
  HashKeyType,
  InferType,
  QueryOptions,
  ScanOptions,
  TableConfig,
  TableSchema,
  UpdateInput,
  UpdateOptions,
} from './types'

export class BaseModel<T extends TableSchema> {
  private schema: T
  private _tableName: string | undefined
  private unprefixedTableName: string
  private client = getDynamoDBDocumentClient()
  private hashKey: string
  private rangeKey: string | null

  // Public accessors for auto-discovery
  public readonly _schema: T
  public readonly _config: TableConfig

  constructor(schema: T, config: TableConfig) {
    this.schema = schema
    this.unprefixedTableName = config.tableName
    this.hashKey = getHashKey(schema)
    this.rangeKey = getRangeKey(schema)

    // Store for auto-discovery
    this._schema = schema
    this._config = config
  }

  get tableName(): string {
    if (this._tableName == null) {
      this._tableName = getPrefixedTableName(this.unprefixedTableName)
    }

    return this._tableName
  }

  /**
   * Helper method to check if an error is a table not found error
   */
  private isTableNotFoundError(error: any): boolean {
    return (
      error instanceof ResourceNotFoundException ||
      error?.name === 'ResourceNotFoundException' ||
      error?.code === 'ResourceNotFoundException' ||
      (error?.message && error.message.includes('Table not found')) ||
      (error?.message && error.message.includes('Requested resource not found'))
    )
  }

  /**
   * Check if this model supports soft delete
   */
  private supportsSoftDelete(): boolean {
    return 'isDeleted' in this.schema
  }

  /**
   * Add soft delete filter to scan/query operations
   */
  private addSoftDeleteFilter(
    expressionAttributeNames: Record<string, string> = {},
    expressionAttributeValues: Record<string, any> = {},
    filterExpression?: string,
  ) {
    if (!this.supportsSoftDelete()) {
      return {
        expressionAttributeNames,
        expressionAttributeValues,
        filterExpression,
      }
    }

    const softDeleteFilter = '#isDeleted = :isDeleted'
    const newExpressionAttributeNames = {
      ...expressionAttributeNames,
      '#isDeleted': 'isDeleted',
    }
    const newExpressionAttributeValues = {
      ...expressionAttributeValues,
      ':isDeleted': false,
    }

    const newFilterExpression = filterExpression
      ? `(${filterExpression}) AND ${softDeleteFilter}`
      : softDeleteFilter

    return {
      expressionAttributeNames: newExpressionAttributeNames,
      expressionAttributeValues: newExpressionAttributeValues,
      filterExpression: newFilterExpression,
    }
  }

  /**
   * Create a new item
   */
  async create(input: CreateInput<T>): Promise<InferType<T>> {
    // Apply defaults and validate
    const item = applyDefaults(this.schema, input)
    validateItem(this.schema, item)

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    })

    await this.client.send(command)
    return item as InferType<T>
  }

  /**
   * Get a single item by hash key (and range key if applicable)
   */
  async get(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue?: any,
  ): Promise<InferType<T> | null> {
    try {
      const key: Record<string, any> = {
        [this.hashKey]: hashKeyValue,
      }

      if (this.rangeKey && rangeKeyValue !== undefined) {
        key[this.rangeKey] = rangeKeyValue
      }

      const command = new GetCommand({
        TableName: this.tableName,
        Key: key,
      })

      const result = await this.client.send(command)
      return result.Item ? (result.Item as InferType<T>) : null
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Scan all items in the table. **This returns the underlying raw result.**
   * To get an array of items, use `getAll()` instead.
   */
  async scan(options: ScanOptions = {}): Promise<DynamoDBItem<InferType<T>[]>> {
    try {
      const input: ScanCommandInput = {
        TableName: this.tableName,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
      }

      if (options.filterExpression) {
        // Add soft delete filtering if model supports it
        const softDeleteFilter = this.addSoftDeleteFilter(
          options.expressionAttributeNames,
          options.expressionAttributeValues,
          options.filterExpression,
        )

        input.FilterExpression = softDeleteFilter.filterExpression
        input.ExpressionAttributeNames =
          softDeleteFilter.expressionAttributeNames
        input.ExpressionAttributeValues =
          softDeleteFilter.expressionAttributeValues
      }

      const command = new ScanCommand(input)

      const result = await this.client.send(command)

      return {
        item: (result.Items || []) as InferType<T>[],
        consumed: result.ConsumedCapacity?.CapacityUnits,
        scannedCount: result.ScannedCount,
        lastEvaluatedKey: result.LastEvaluatedKey,
      }
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return {
          item: [] as InferType<T>[],
          consumed: 0,
          scannedCount: 0,
          lastEvaluatedKey: undefined,
        }
      }
      throw error
    }
  }

  /**
   * Gets all items in the table. Equivalent to `scan()` but also returns the actual items.
   */
  async getAll(options: ScanOptions = {}) {
    return (await this.scan(options)).item
  }

  /**
   * Query items by hash key
   */
  async query(
    hashKeyValue: HashKeyType<T>,
    options: QueryOptions = {},
  ): Promise<DynamoDBItem<InferType<T>[]>> {
    try {
      const keyConditionExpression =
        options.keyConditionExpression || `#hk = :hkval`
      const expressionAttributeNames = {
        '#hk': this.hashKey,
        ...(options.expressionAttributeNames || {}),
      }
      const expressionAttributeValues = {
        ':hkval': hashKeyValue,
        ...(options.expressionAttributeValues || {}),
      }

      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
        FilterExpression: options.filterExpression,
        ScanIndexForward: options.scanIndexForward,
      })

      const result = await this.client.send(command)

      return {
        item: (result.Items || []) as InferType<T>[],
        consumed: result.ConsumedCapacity?.CapacityUnits,
        scannedCount: result.ScannedCount,
        lastEvaluatedKey: result.LastEvaluatedKey,
      }
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return {
          item: [] as InferType<T>[],
          consumed: 0,
          scannedCount: 0,
          lastEvaluatedKey: undefined,
        }
      }
      throw error
    }
  }

  /**
   * Update an existing item
   */
  async update(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue: any = undefined,
    updates: UpdateInput<T>,
    options: UpdateOptions = {},
  ): Promise<InferType<T> | null> {
    try {
      const key: Record<string, any> = {
        [this.hashKey]: hashKeyValue,
      }

      if (this.rangeKey && rangeKeyValue !== undefined) {
        key[this.rangeKey] = rangeKeyValue
      }

      // Build update expression if not provided
      let updateExpression = options.updateExpression
      const expressionAttributeNames = options.expressionAttributeNames || {}
      const expressionAttributeValues = options.expressionAttributeValues || {}

      if (!updateExpression) {
        const setExpressions: string[] = []
        Object.entries(updates).forEach(([field, value], index) => {
          const nameKey = `#field${index}`
          const valueKey = `:value${index}`
          setExpressions.push(`${nameKey} = ${valueKey}`)
          expressionAttributeNames[nameKey] = field
          expressionAttributeValues[valueKey] = value
        })

        if (setExpressions.length > 0) {
          updateExpression = `SET ${setExpressions.join(', ')}`
        }
      }

      if (!updateExpression) {
        throw new Error('No fields to update')
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: options.conditionExpression,
        ReturnValues: options.returnValues || 'ALL_NEW',
      })

      const result = await this.client.send(command)
      return result.Attributes ? (result.Attributes as InferType<T>) : null
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Delete an item
   */
  async delete(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue?: any,
  ): Promise<InferType<T> | null> {
    try {
      const key: Record<string, any> = {
        [this.hashKey]: hashKeyValue,
      }

      if (this.rangeKey && rangeKeyValue !== undefined) {
        key[this.rangeKey] = rangeKeyValue
      }

      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: key,
        ReturnValues: 'ALL_OLD',
      })

      const result = await this.client.send(command)
      return result.Attributes ? (result.Attributes as InferType<T>) : null
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Put an item (create or replace)
   */
  async put(item: InferType<T>): Promise<InferType<T>> {
    // Apply defaults and validate
    const itemWithDefaults = applyDefaults(this.schema, item)
    validateItem(this.schema, itemWithDefaults)

    const command = new PutCommand({
      TableName: this.tableName,
      Item: itemWithDefaults,
    })

    await this.client.send(command)
    return itemWithDefaults as InferType<T>
  }

  /**
   * Check if an item exists
   */
  async exists(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue?: any,
  ): Promise<boolean> {
    try {
      const item = await this.get(hashKeyValue, rangeKeyValue)
      return item !== null
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return false
      }
      throw error
    }
  }

  /**
   * Count items in the table
   */
  async count(): Promise<number> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        Select: 'COUNT',
      })

      const result = await this.client.send(command)
      return result.Count || 0
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return 0
      }
      throw error
    }
  }

  // ==========================================
  // 🚀 QUERY BUILDER METHODS
  // ==========================================

  /**
   * Find items by field value (simple equality)
   *
   * @param field - The field name to filter by
   * @param value - The value to match
   * @example
   * ```typescript
   * const completedTodos = await TodoItem.findWhere('completed', true);
   * const todosByTitle = await TodoItem.findWhere('title', 'Learn TypeScript');
   * ```
   */
  async findWhere<K extends keyof InferType<T>>(
    field: K,
    value: InferType<T>[K],
  ): Promise<InferType<T>[]> {
    try {
      const fieldName = String(field)
      const expressionAttributeNames = { [`#${fieldName}`]: fieldName }
      const expressionAttributeValues = { [`:${fieldName}`]: value }
      const filterExpression = `#${fieldName} = :${fieldName}`

      // Add soft delete filtering
      const softDeleteFilter = this.addSoftDeleteFilter(
        expressionAttributeNames,
        expressionAttributeValues,
        filterExpression,
      )

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: softDeleteFilter.filterExpression,
        ExpressionAttributeNames: softDeleteFilter.expressionAttributeNames,
        ExpressionAttributeValues: softDeleteFilter.expressionAttributeValues,
      })

      const result = await this.client.send(command)
      return (result.Items || []) as InferType<T>[]
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return []
      }
      throw error
    }
  }
  /**
   * Find items matching multiple field conditions (AND logic)
   *
   * @param conditions - Object with field-value pairs
   * @example
   * ```typescript
   * const items = await TodoItem.findMany({
   *   completed: false,
   *   title: 'Learn TypeScript'
   * });
   * ```
   */
  async findMany(conditions: Partial<InferType<T>>): Promise<InferType<T>[]> {
    try {
      const conditionEntries = Object.entries(conditions)

      if (conditionEntries.length === 0) {
        const result = await this.scan()
        return result.item
      }

      const filterExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      conditionEntries.forEach(([field, value], index) => {
        const nameKey = `#field${index}`
        const valueKey = `:value${index}`
        filterExpressions.push(`${nameKey} = ${valueKey}`)
        expressionAttributeNames[nameKey] = field
        expressionAttributeValues[valueKey] = value
      })

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })

      const result = await this.client.send(command)
      return (result.Items || []) as InferType<T>[]
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return []
      }
      throw error
    }
  }

  /**
   * Find the first item matching conditions
   *
   * @param conditions - Object with field-value pairs
   * @example
   * ```typescript
   * const firstCompleted = await TodoItem.findFirst({ completed: true });
   * ```
   */
  async findFirst(
    conditions: Partial<InferType<T>>,
  ): Promise<InferType<T> | null> {
    try {
      const conditionEntries = Object.entries(conditions)

      if (conditionEntries.length === 0) {
        const result = await this.scan({ limit: 1 })
        return result.item[0] || null
      }

      const filterExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      conditionEntries.forEach(([field, value], index) => {
        const nameKey = `#field${index}`
        const valueKey = `:value${index}`
        filterExpressions.push(`${nameKey} = ${valueKey}`)
        expressionAttributeNames[nameKey] = field
        expressionAttributeValues[valueKey] = value
      })

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: 1,
      })

      const result = await this.client.send(command)
      const items = result.Items || []
      return items.length > 0 ? (items[0] as InferType<T>) : null
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Find all items (alias for scan for consistency)
   *
   * @example
   * ```typescript
   * const allTodos = await TodoItem.findAll();
   * ```
   */
  async findAll(): Promise<InferType<T>[]> {
    const result = await this.scan()
    return result.item
  }

  /**
   * Simple query builder interface
   *
   * @param field - Field to filter by
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @example
   * ```typescript
   * const todos = await TodoItem.where('completed', '=', true);
   * const recentTodos = await TodoItem.where('createdAt', '>', '2024-01-01');
   * ```
   */
  async where<K extends keyof InferType<T>>(
    field: K,
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'begins_with' | 'contains',
    value: InferType<T>[K],
  ): Promise<InferType<T>[]> {
    try {
      const fieldName = String(field)
      let filterExpression: string

      switch (operator) {
        case '=':
          filterExpression = `#${fieldName} = :${fieldName}`
          break
        case '!=':
          filterExpression = `#${fieldName} <> :${fieldName}`
          break
        case '<':
          filterExpression = `#${fieldName} < :${fieldName}`
          break
        case '<=':
          filterExpression = `#${fieldName} <= :${fieldName}`
          break
        case '>':
          filterExpression = `#${fieldName} > :${fieldName}`
          break
        case '>=':
          filterExpression = `#${fieldName} >= :${fieldName}`
          break
        case 'begins_with':
          filterExpression = `begins_with(#${fieldName}, :${fieldName})`
          break
        case 'contains':
          filterExpression = `contains(#${fieldName}, :${fieldName})`
          break
        default:
          throw new Error(`Unsupported operator: ${operator}`)
      }

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
          [`#${fieldName}`]: fieldName,
        },
        ExpressionAttributeValues: {
          [`:${fieldName}`]: value,
        },
      })

      const result = await this.client.send(command)
      return (result.Items || []) as InferType<T>[]
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return []
      }
      throw error
    }
  }

  /**
   * Count items matching conditions
   *
   * @param conditions - Object with field-value pairs
   * @example
   * ```typescript
   * const completedCount = await TodoItem.countWhere({ completed: true });
   * ```
   */
  async countWhere(conditions: Partial<InferType<T>>): Promise<number> {
    try {
      const conditionEntries = Object.entries(conditions)

      if (conditionEntries.length === 0) {
        return this.count()
      }

      const filterExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      conditionEntries.forEach(([field, value], index) => {
        const nameKey = `#field${index}`
        const valueKey = `:value${index}`
        filterExpressions.push(`${nameKey} = ${valueKey}`)
        expressionAttributeNames[nameKey] = field
        expressionAttributeValues[valueKey] = value
      })

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Select: 'COUNT',
      })

      const result = await this.client.send(command)
      return result.Count || 0
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return 0
      }
      throw error
    }
  }

  /**
   * Create a chainable query builder
   *
   * @example
   * ```typescript
   * const todos = await TodoItem
   *   .queryBuilder()
   *   .where('completed', '=', false)
   *   .where('title', 'contains', 'urgent')
   *   .limit(10)
   *   .execute();
   *
   * const firstPending = await TodoItem
   *   .queryBuilder()
   *   .where('completed', '=', false)
   *   .first();
   *
   * const count = await TodoItem
   *   .queryBuilder()
   *   .where('completed', '=', true)
   *   .count();
   * ```
   */
  queryBuilder(): QueryBuilder<T> {
    return new QueryBuilder<T>(this.tableName)
  }

  // ==========================================
  // 🗑️ SOFT DELETE METHODS
  // ==========================================

  /**
   * Soft delete an item (if model supports soft delete)
   *
   * @param hashKeyValue - Hash key value
   * @param rangeKeyValue - Range key value (if applicable)
   * @param deletedBy - User ID who performed the deletion
   * @example
   * ```typescript
   * await TodoItem.softDelete('todo-id', undefined, 'user-123');
   * ```
   */
  async softDelete(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue?: any,
    deletedBy?: string,
  ): Promise<InferType<T> | null> {
    if (!this.supportsSoftDelete()) {
      throw new Error(
        'This model does not support soft delete. Add isDeleted field to schema.',
      )
    }

    const updates: any = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    }

    if (deletedBy && 'deletedBy' in this.schema) {
      updates.deletedBy = deletedBy
    }

    return this.update(hashKeyValue, rangeKeyValue, updates)
  }

  /**
   * Restore a soft-deleted item
   *
   * @param hashKeyValue - Hash key value
   * @param rangeKeyValue - Range key value (if applicable)
   */
  async restore(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue?: any,
  ): Promise<InferType<T> | null> {
    if (!this.supportsSoftDelete()) {
      throw new Error('This model does not support soft delete.')
    }

    const updates: any = {
      isDeleted: false,
    }

    // Remove deletion metadata
    if ('deletedAt' in this.schema) {
      updates.deletedAt = null
    }
    if ('deletedBy' in this.schema) {
      updates.deletedBy = null
    }

    return this.update(hashKeyValue, rangeKeyValue, updates)
  }

  /**
   * Find items including soft-deleted ones
   *
   * @param conditions - Search conditions
   * @param includeDeleted - Whether to include deleted items
   */
  async findManyWithDeleted(
    conditions: Partial<InferType<T>>,
    includeDeleted: boolean = true,
  ): Promise<InferType<T>[]> {
    try {
      const conditionEntries = Object.entries(conditions)

      if (conditionEntries.length === 0 && includeDeleted) {
        const result = await this.scan()
        return result.item
      }

      const filterExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      conditionEntries.forEach(([field, value], index) => {
        const nameKey = `#field${index}`
        const valueKey = `:value${index}`
        filterExpressions.push(`${nameKey} = ${valueKey}`)
        expressionAttributeNames[nameKey] = field
        expressionAttributeValues[valueKey] = value
      })

      // Add soft delete filter only if we don't want deleted items
      if (!includeDeleted && this.supportsSoftDelete()) {
        const softDeleteFilter = this.addSoftDeleteFilter(
          expressionAttributeNames,
          expressionAttributeValues,
          filterExpressions.length > 0
            ? filterExpressions.join(' AND ')
            : undefined,
        )

        const command = new ScanCommand({
          TableName: this.tableName,
          FilterExpression: softDeleteFilter.filterExpression,
          ExpressionAttributeNames: softDeleteFilter.expressionAttributeNames,
          ExpressionAttributeValues: softDeleteFilter.expressionAttributeValues,
        })

        const result = await this.client.send(command)
        return (result.Items || []) as InferType<T>[]
      }

      // Regular query without soft delete filtering
      const command = new ScanCommand({
        TableName: this.tableName,
        ...(filterExpressions.length > 0 && {
          FilterExpression: filterExpressions.join(' AND '),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      })

      const result = await this.client.send(command)
      return (result.Items || []) as InferType<T>[]
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return []
      }
      throw error
    }
  }

  /**
   * Find only soft-deleted items
   */
  async findDeleted(): Promise<InferType<T>[]> {
    if (!this.supportsSoftDelete()) {
      return []
    }

    return this.findWhere('isDeleted' as keyof InferType<T>, true as any)
  }

  /**
   * Permanently delete an item (hard delete)
   * Use with caution - this cannot be undone!
   */
  async forceDelete(
    hashKeyValue: HashKeyType<T>,
    rangeKeyValue?: any,
  ): Promise<InferType<T> | null> {
    return this.delete(hashKeyValue, rangeKeyValue)
  }

  async createTableIfNotExists(): Promise<void> {
    const client = getDynamoDBClient()

    try {
      // Try to describe the table to check if it exists
      const result = await client.send(
        new DescribeTableCommand({ TableName: this.tableName }),
      )

      // Table exists, but check if it's actually ready for operations
      if (result.Table?.TableStatus === 'ACTIVE') {
        // Even if status is ACTIVE, verify it's ready with a scan operation
        try {
          await this.client.send(
            new ScanCommand({
              TableName: this.tableName,
              Limit: 1,
            }),
          )
          return
        } catch (scanError: any) {
          // If scan fails, the table isn't actually ready yet
          console.log(
            `Table ${this.tableName} shows as ACTIVE but not yet ready for operations`,
          )
          await this.waitForTableToBeActive(this.tableName)
          return
        }
      } else {
        console.log(
          `Table ${this.tableName} exists but status is: ${result.Table?.TableStatus}`,
        )
        // Wait for it to become active
        await this.waitForTableToBeActive(this.tableName)
        return
      }
    } catch (error) {
      // If table doesn't exist, create it
      if (error instanceof ResourceNotFoundException) {
        console.log(`Creating table ${this.tableName}...`)
        await this.createTable()
        return
      }
      // If it's some other error, re-throw it
      throw error
    }
  }

  /**
   * Create the DynamoDB table based on the schema
   */
  private async createTable(): Promise<void> {
    const client = getDynamoDBClient()

    // Convert our field type to DynamoDB attribute type
    const getAttributeType = (fieldDefinition: any): ScalarAttributeType => {
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

    // Build attribute definitions - only for key attributes
    const attributeDefinitions: AttributeDefinition[] = [
      {
        AttributeName: this.hashKey,
        AttributeType: getAttributeType(this.schema[this.hashKey]),
      },
    ]

    // Build key schema
    const keySchema: KeySchemaElement[] = [
      {
        AttributeName: this.hashKey,
        KeyType: 'HASH',
      },
    ]

    // Add range key if present
    if (this.rangeKey) {
      attributeDefinitions.push({
        AttributeName: this.rangeKey,
        AttributeType: getAttributeType(this.schema[this.rangeKey]),
      })

      keySchema.push({
        AttributeName: this.rangeKey,
        KeyType: 'RANGE',
      })
    }

    const createTableParams = {
      TableName: this.tableName,
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
      BillingMode:
        this._config.billingMode || ('PAY_PER_REQUEST' as BillingMode),
      ...(this._config.billingMode === 'PROVISIONED' && {
        ProvisionedThroughput: {
          ReadCapacityUnits: this._config.readCapacityUnits || 5,
          WriteCapacityUnits: this._config.writeCapacityUnits || 5,
        },
      }),
    }

    try {
      await client.send(new CreateTableCommand(createTableParams))
      console.log(`Table ${this.tableName} created successfully`)

      // Wait for table to become active
      await this.waitForTableToBeActive(this.tableName)
    } catch (error) {
      // If table was created between our check and create attempt, that's okay
      if (error instanceof Error && error.name === 'ResourceInUseException') {
        // Even if table exists, we should still wait for it to be active
        await this.waitForTableToBeActive(this.tableName)
        return
      }
      throw error
    }
  }

  /**
   * Wait for a DynamoDB table to become ready for operations
   * Uses ScanCommand to verify the table is actually usable
   */
  private async waitForTableToBeActive(
    tableName: string,
    maxWaitTimeMs: number = 60000, // 60 seconds max wait
    initialDelayMs: number = 500, // Start with 500ms delay
  ): Promise<void> {
    const client = getDynamoDBClient()
    const documentClient = getDynamoDBDocumentClient()
    const startTime = Date.now()
    let delay = initialDelayMs
    let successCount = 0

    console.log(
      `Waiting for table ${tableName} to become ready for operations...`,
    )

    while (Date.now() - startTime < maxWaitTimeMs) {
      try {
        // First check if table exists and is ACTIVE
        const describeResult = await client.send(
          new DescribeTableCommand({ TableName: tableName }),
        )

        if (describeResult.Table?.TableStatus !== 'ACTIVE') {
          console.log(
            `Table ${tableName} status: ${describeResult.Table?.TableStatus}, waiting ${delay}ms...`,
          )
        } else {
          // Table shows as ACTIVE, now test if it's actually ready for operations
          try {
            await documentClient.send(
              new ScanCommand({
                TableName: tableName,
                Limit: 1, // Just scan one item to test readiness
              }),
            )
            successCount++

            if (successCount >= 2) {
              console.log(`Table ${tableName} is now ready for operations`)
              return
            }
          } catch (scanError: any) {
            // If we get "Cannot do operations on a non-existent table" or similar, keep waiting
            if (
              scanError.name === 'ResourceNotFoundException' ||
              scanError.message?.includes('non-existent table') ||
              scanError.message?.includes('does not exist')
            ) {
              console.log(
                `Table ${tableName} not yet ready for operations, waiting ${delay}ms...`,
              )
            } else {
              // Some other scan error, re-throw it
              throw scanError
            }
          }
        }
      } catch (error) {
        // If table doesn't exist yet, treat it as not ready
        if (!(error instanceof ResourceNotFoundException)) {
          throw error
        }
        console.log(`Table ${tableName} not found yet, waiting ${delay}ms...`)
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Exponential backoff with jitter
      delay = Math.min(delay * 1.5 + Math.random() * 100, 5000) // Max 5 seconds between checks
    }

    throw new Error(
      `Timeout waiting for table ${tableName} to become ready for operations after ${maxWaitTimeMs}ms`,
    )
  }
}
