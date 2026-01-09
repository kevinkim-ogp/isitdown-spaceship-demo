import { UserData } from '~/models'

// Mock the User model to use the same in-memory data store as the auth helper
vi.mock('~/models/User', async () => {
  const { mockDatabaseClient } = await import('~tests/integration/helpers/auth')

  return {
    default: {
      async get(email: string): Promise<UserData | null> {
        const result = await mockDatabaseClient.models.User.get({ email })
        console.log('<< User.get', email, result.data)
        return result.data
      },
    },
  }
})
