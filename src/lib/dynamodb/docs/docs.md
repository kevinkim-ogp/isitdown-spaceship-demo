# 🚀 Type-Safe DynamoDB Abstraction

A modern, type-safe DynamoDB abstraction layer that provides ORM-like functionality while maintaining DynamoDB's performance characteristics. Built with TypeScript for full type inference and developer experience.

## ✨ Features

- **🎯 Full Type Safety** - Complete TypeScript type inference from schema definitions
- **🛠️ Simplified Schema Helpers** - Easy-to-use functions for common field patterns
- **🔄 Auto-Generated Types** - Types automatically inferred from your schema
- **🗑️ Soft Delete Support** - Built-in soft delete with automatic filtering
- **📝 Common Field Patterns** - Timestamps, audit trails, versioning, and more
- **🔍 Enhanced CRUD** - Type-safe create, read, update, delete operations
- **📊 Model Auto-Discovery** - Automatic model registration and table creation
- **⚡ Performance Optimized** - Leverages DynamoDB Document Client for optimal performance

## 🚀 Quick Start

### 1. Define Your Model

```typescript
import {
  createModel,
  primaryKey,
  required,
  optional,
  fieldMixins,
  ExtractType,
} from "./lib/dynamodb";

const UserSchema = {
  id: primaryKey(),
  email: required(String),
  firstName: required(String),
  lastName: required(String),
  role: {
    type: String,
    required: true,
    default: () => "user",
  } as const,
  ...fieldMixins.timestamps(), // Adds createdAt, updatedAt
} as const;

const User = createModel(UserSchema, "Users");
export type UserData = ExtractType<typeof UserSchema>;
// Result: { id: string, email: string, firstName: string, lastName: string, role: string, createdAt: string, updatedAt: string }
```

### 2. Use Type-Safe Operations

```typescript
// Create with full type safety
const user = await User.create({
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "admin", // ✅ Type-safe
  // id, createdAt, updatedAt automatically added
});

// Get with type inference
const foundUser = await User.get(user.id);
// foundUser is fully typed: UserData

// Update with partial data
const updated = await User.update(user.id, undefined, {
  firstName: "Jane", // ✅ Only valid fields allowed
  // TypeScript error if you try invalid fields
});

// Scan all users
const allUsers = await User.scan();
// Returns: UserData[]
```

## 📚 Schema Helpers

### Basic Field Helpers

```typescript
// Primary key field
id: primaryKey();
// → { type: String, required: true, primaryKey: true }

// Required field
email: required(String);
// → { type: String, required: true }

// Optional field with default
status: optional(String, "active");
// → { type: String, required: false, default: () => 'active' }
```

### Common Field Patterns

```typescript
const TaskSchema = {
  id: primaryKey(),
  title: required(String),
  description: optional(String, ""),

  // Add common patterns
  ...fieldMixins.timestamps(), // createdAt, updatedAt
  ...fieldMixins.softDelete(), // isDeleted, deletedAt, deletedBy
  ...fieldMixins.auditTrail(), // createdBy, updatedBy
  ...fieldMixins.versioning(), // version (auto-increment)

  // Or add everything at once
  ...fieldMixins.fullAudit(), // All of the above
} as const;
```

## 🗑️ Soft Delete

Built-in soft delete functionality with automatic filtering:

```typescript
// Soft delete (sets isDeleted: true, deletedAt: timestamp)
await Task.softDelete(taskId);

// Regular queries automatically exclude soft-deleted items
const activeTasks = await Task.scan(); // Only active tasks

// Restore soft-deleted item
await Task.restore(taskId);

// Permanent delete (actually removes from database)
await Task.delete(taskId);
```

## 🎯 Advanced Usage Examples

### Complex Model with All Features

```typescript
const TaskSchema = {
  id: primaryKey(),
  title: required(String),
  description: optional(String, ""),
  status: {
    type: String,
    required: true,
    default: () => "pending",
  } as const,
  priority: {
    type: String,
    required: true,
    default: () => "medium",
  } as const,
  assigneeId: {
    type: String,
    required: false,
  } as const,
  dueDate: {
    type: String,
    required: false,
  } as const,
  tags: optional(String, "[]"), // JSON array as string
  ...fieldMixins.timestamps(),
  ...fieldMixins.softDelete(),
  ...fieldMixins.auditTrail(),
} as const;

const Task = createModel(TaskSchema, "Tasks");
export type TaskData = ExtractType<typeof TaskSchema>;
```

### Bulk Operations

```typescript
// Create multiple items
const tasks = await Promise.all([
  Task.create({ title: "Task 1", status: "pending" }),
  Task.create({ title: "Task 2", status: "in-progress" }),
  Task.create({ title: "Task 3", status: "completed" }),
]);

// Bulk delete
await Promise.all(tasks.map((task) => Task.delete(task.id)));
```

## 🏗️ Architecture

The abstraction is built with several key components:

### Core Components

1. **`BaseModel`** - Main model class providing CRUD operations
2. **`types.ts`** - Type inference utilities and core definitions
3. **`schemaHelpers.ts`** - Simplified helper functions for common patterns
4. **`model.ts`** - Model factory functions with auto-registration
5. **`registry.ts`** - Auto-discovery system for models

### Type System

The type system uses advanced TypeScript features:

- **Const Assertions** - Preserves literal types in schemas
- **Conditional Types** - Dynamic type inference based on schema
- **Template Literal Types** - Type-safe field access
- **Utility Types** - Helper types for common patterns

### Field Mixins

Field mixins provide reusable field patterns:

```typescript
fieldMixins.timestamps(); // Standard created/updated timestamps
fieldMixins.softDelete(); // Soft delete with metadata
fieldMixins.auditTrail(); // User tracking for changes
fieldMixins.versioning(); // Optimistic concurrency control
fieldMixins.fullAudit(); // All audit patterns combined
```

## 🔧 Configuration

### DynamoDB Client Setup

The abstraction uses your existing DynamoDB Document Client configuration:

```typescript
// In your lib/dynamodb/DDBClient.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint:
    process.env.NODE_ENV === "development"
      ? "http://localhost:8000"
      : undefined,
});

export const docClient = DynamoDBDocumentClient.from(ddbClient);
```

### Auto Table Creation

Tables are automatically created when models are first used:

```typescript
// Tables created with sensible defaults
{
  TableName: "YourTableName",
  KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
  AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  BillingMode: "PAY_PER_REQUEST",
}
```

## 🚀 Migration Guide

### From Raw DynamoDB

**Before:**

```typescript
const params = {
  TableName: "Users",
  Item: {
    id: { S: uuid() },
    email: { S: "user@example.com" },
    createdAt: { S: new Date().toISOString() },
  },
};
await ddbClient.putItem(params);
```

**After:**

```typescript
const user = await User.create({
  email: "user@example.com",
  // id and createdAt automatically added
});
```

### Benefits

- **90% less boilerplate code**
- **Full type safety** - catch errors at compile time
- **IntelliSense support** - auto-completion for all fields
- **Consistent patterns** - standardized approach across your app
- **Built-in best practices** - soft delete, audit trails, etc.

## 🎯 Best Practices

1. **Use Const Assertions** - Always add `as const` to schemas
2. **Leverage Field Mixins** - Use common patterns instead of manual fields
3. **Type Exports** - Export types for use in other files
4. **Meaningful Defaults** - Provide sensible default values
5. **Soft Delete** - Use soft delete for important data
