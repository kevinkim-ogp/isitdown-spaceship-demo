// In-memory store for users (replaces database)
// This is in a separate file to avoid circular dependencies

export const users = new Map<
  string,
  {
    email: string
    name?: string
    image?: string
  }
>()
