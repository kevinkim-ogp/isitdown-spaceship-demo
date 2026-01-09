# DynamoDB Quickstart

## Where to Define and Register Models

- **Define each model** in a separate file in `src/lib/models/` (e.g. `User.ts`, `Task.ts`).
- **Register models automatically** by exporting them from `src/lib/models/index.ts`. This enables auto-discovery and table initialization.

Example structure:

```
src/lib/models/
  User.ts         // Define your model here
  Task.ts         // ...other models
  index.ts        // Export all models for registration
```

## Quickstart: Define a Model

1. **Import helpers:**

```typescript
import {
  createModel,
  primaryKey,
  required,
  optional,
  fieldMixins,
  ExtractType,
} from "../dynamodb";
```

2. **Define your schema:**

```typescript
const UserSchema = {
  id: primaryKey(),
  email: required(String),
  name: required(String),
  ...fieldMixins.timestamps(), // adds createdAt, updatedAt
} as const;
```

3. **Create and export the model:**

```typescript
const User = createModel(UserSchema, "Users");
export default User;
export type UserData = ExtractType<typeof UserSchema>;
```

## Register the Model

In `src/lib/models/index.ts`, export your model:

```typescript
export { default as User } from "./User";
export type { UserData } from "./User";
```

All models exported here are auto-registered and can be initialized with:

```typescript
import { initializeAllModels } from "../dynamodb/registry";
await initializeAllModels();
```

## Field Types Reference

- `primaryKey()` — Required string PK (UUID default)
- `rangeKey(type, default?)` — Sort key
- `required(Type)` — Required field
- `optional(Type, default?)` — Optional field, with optional default
- `timestamp()` — ISO string timestamp
- `updatedTimestamp()` — ISO string, for last update
- `unixTimestamp()` — Number (ms since epoch)
- `dateField()` — Date string (YYYY-MM-DD)
- `versionField()` — Version number (for optimistic locking)
- `statusField(default?)` — Status string with default
- `userField()` — User ID string (for audit)

## Field Mixins (Reusable Patterns)

- `fieldMixins.id()` — Standard PK
- `fieldMixins.timestamps()` — Adds `createdAt`, `updatedAt` (ISO strings)
- `fieldMixins.unixTimestamps()` — Adds `createdAt`, `updatedAt` (numbers)
- `fieldMixins.softDelete()` — Adds `isDeleted`, `deletedAt`, `deletedBy`
- `fieldMixins.auditTrail()` — Adds `createdBy`, `updatedBy`
- `fieldMixins.versioning()` — Adds `version` (auto-increment)
- `fieldMixins.statusTracking(default?)` — Adds `status`, `statusChangedAt`
- `fieldMixins.fullAudit()` — All of the above

## Example

```typescript
// src/lib/models/Task.ts
import {
  createModel,
  primaryKey,
  required,
  optional,
  fieldMixins,
  ExtractType,
} from "../dynamodb";

const TaskSchema = {
  id: primaryKey(),
  title: required(String),
  status: optional(String, "pending"),
  ...fieldMixins.fullAudit(),
} as const;

const Task = createModel(TaskSchema, "Tasks");
export default Task;
export type TaskData = ExtractType<typeof TaskSchema>;
```

// In src/lib/models/index.ts

```typescript
export { default as Task } from "./Task";
export type { TaskData } from "./Task";
```

See the main README for advanced usage and best practices.
