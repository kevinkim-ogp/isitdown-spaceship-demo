/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Chainable Query Builder for DynamoDB operations
 */

import { ScanCommand } from '@aws-sdk/lib-dynamodb'

import { getDynamoDBDocumentClient } from './DDBClient'
import type { InferType, TableSchema } from './types'

export class QueryBuilder<T extends TableSchema> {
  private tableName: string
  private client = getDynamoDBDocumentClient()
  private conditions: Array<{
    field: string
    operator: string
    value: any
  }> = []
  private limitValue?: number
  private orderDirection?: 'ASC' | 'DESC'
  private selectFields?: string[]

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Helper method to check if an error is a table not found error
   */
  private isTableNotFoundError(error: any): boolean {
    return (
      error?.name === 'ResourceNotFoundException' ||
      error?.code === 'ResourceNotFoundException' ||
      (error?.message && error.message.includes('Table not found')) ||
      (error?.message && error.message.includes('Requested resource not found'))
    )
  }

  /**
   * Add a where condition (chainable)
   *
   * @param field - Field to filter by
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @example
   * ```typescript
   * const todos = await TodoItem
   *   .query()
   *   .where('completed', '=', false)
   *   .where('title', 'contains', 'urgent')
   *   .limit(10)
   *   .execute();
   * ```
   */
  where<K extends keyof InferType<T>>(
    field: K,
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'begins_with' | 'contains',
    value: InferType<T>[K],
  ): QueryBuilder<T> {
    this.conditions.push({
      field: String(field),
      operator,
      value,
    })
    return this
  }

  /**
   * Set limit for results (chainable)
   *
   * @param count - Maximum number of items to return
   */
  limit(count: number): QueryBuilder<T> {
    this.limitValue = count
    return this
  }

  /**
   * Set order direction (chainable)
   * Note: DynamoDB ordering is limited to sort keys
   *
   * @param direction - ASC or DESC
   */
  orderBy(direction: 'ASC' | 'DESC'): QueryBuilder<T> {
    this.orderDirection = direction
    return this
  }

  /**
   * Select specific fields only (chainable)
   *
   * @param fields - Array of field names to select
   * @example
   * ```typescript
   * const titles = await TodoItem
   *   .query()
   *   .select(['title', 'completed'])
   *   .execute();
   * ```
   */
  select(fields: Array<keyof InferType<T>>): QueryBuilder<T> {
    this.selectFields = fields.map(String)
    return this
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<InferType<T>[]> {
    try {
      if (this.conditions.length === 0) {
        // No conditions, do a simple scan
        const command = new ScanCommand({
          TableName: this.tableName,
          ...(this.limitValue && { Limit: this.limitValue }),
          ...(this.selectFields && {
            ProjectionExpression: this.selectFields.join(', '),
          }),
        })

        const result = await this.client.send(command)
        return (result.Items || []) as InferType<T>[]
      }

      // Build filter expression
      const filterExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      this.conditions.forEach((condition, index) => {
        const nameKey = `#field${index}`
        const valueKey = `:value${index}`

        let expression: string
        switch (condition.operator) {
          case '=':
            expression = `${nameKey} = ${valueKey}`
            break
          case '!=':
            expression = `${nameKey} <> ${valueKey}`
            break
          case '<':
            expression = `${nameKey} < ${valueKey}`
            break
          case '<=':
            expression = `${nameKey} <= ${valueKey}`
            break
          case '>':
            expression = `${nameKey} > ${valueKey}`
            break
          case '>=':
            expression = `${nameKey} >= ${valueKey}`
            break
          case 'begins_with':
            expression = `begins_with(${nameKey}, ${valueKey})`
            break
          case 'contains':
            expression = `contains(${nameKey}, ${valueKey})`
            break
          default:
            throw new Error(`Unsupported operator: ${condition.operator}`)
        }

        filterExpressions.push(expression)
        expressionAttributeNames[nameKey] = condition.field
        expressionAttributeValues[valueKey] = condition.value
      })

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(this.limitValue && { Limit: this.limitValue }),
        ...(this.selectFields && {
          ProjectionExpression: this.selectFields.join(', '),
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
   * Execute and return the first result
   */
  async first(): Promise<InferType<T> | null> {
    try {
      const results = await this.limit(1).execute()
      return results[0] || null
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /**
   * Execute and return count only
   */
  async count(): Promise<number> {
    try {
      if (this.conditions.length === 0) {
        const command = new ScanCommand({
          TableName: this.tableName,
          Select: 'COUNT',
        })

        const result = await this.client.send(command)
        return result.Count || 0
      }

      // Build filter expression for count
      const filterExpressions: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      this.conditions.forEach((condition, index) => {
        const nameKey = `#field${index}`
        const valueKey = `:value${index}`

        let expression: string
        switch (condition.operator) {
          case '=':
            expression = `${nameKey} = ${valueKey}`
            break
          case '!=':
            expression = `${nameKey} <> ${valueKey}`
            break
          default:
            expression = `${nameKey} = ${valueKey}`
        }

        filterExpressions.push(expression)
        expressionAttributeNames[nameKey] = condition.field
        expressionAttributeValues[valueKey] = condition.value
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
}
