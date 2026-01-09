import { UserData } from '~/models'
import { VerificationTokenData } from '~/models/VerificationToken'

// In-memory store for test data
export const testData = {
  users: new Map<string, UserData>(),
  verificationTokens: new Map<string, VerificationTokenData>(),
}

export const mockDatabaseClient = {
  models: {
    User: {
      async get({ email }: { email: string }) {
        const user = testData.users.get(email)
        console.log('<< get', email, testData)
        return { data: user || null }
      },
      async create(userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>) {
        const user: UserData = {
          email: userData.email,
          name: userData.name,
          image: userData.image,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        testData.users.set(user.email, user)
        console.log('>>create', user, testData)
        return { data: user }
      },
      async update(userData: {
        email: string
        name?: string | null
        image?: string | null
      }) {
        const existingUser = testData.users.get(userData.email)
        if (!existingUser) {
          return { data: null }
        }
        const updatedUser: UserData = {
          ...existingUser,
          name: userData.name != null ? userData.name : existingUser.name,
          image: userData.image ?? existingUser.image,
          updatedAt: new Date().toISOString(),
        }
        testData.users.set(userData.email, updatedUser)
        return { data: updatedUser }
      },
      async list() {
        return { data: Array.from(testData.users.values()) }
      },
      async delete({ email }: { email: string }) {
        const user = testData.users.get(email)
        testData.users.delete(email)
        return { data: user || null }
      },
    },
    VerificationToken: {
      async get({ email }: { email: string }) {
        const token = testData.verificationTokens.get(email)
        return { data: token || null }
      },
      async create(
        tokenData: Omit<VerificationTokenData, 'createdAt' | 'updatedAt'>,
      ) {
        const token: VerificationTokenData = {
          ...tokenData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        testData.verificationTokens.set(token.email!, token)
        return { data: token }
      },
      async update(
        tokenData: Partial<VerificationTokenData> & {
          email: string
        },
      ) {
        const existingToken = testData.verificationTokens.get(tokenData.email)
        if (!existingToken) {
          return { data: null }
        }
        const updatedToken: VerificationTokenData = {
          ...existingToken,
          ...tokenData,
          updatedAt: new Date().toISOString(),
        }
        testData.verificationTokens.set(tokenData.email, updatedToken)
        return { data: updatedToken }
      },
      async list() {
        return { data: Array.from(testData.verificationTokens.values()) }
      },
      async delete({ email }: { email: string }) {
        const token = testData.verificationTokens.get(email)
        testData.verificationTokens.delete(email)
        return { data: token || null }
      },
    },
  },
}

// Clear test data before each test
export const clearTestData = () => {
  testData.users.clear()
  testData.verificationTokens.clear()
}

export const auth = async (user: UserData) => {
  // Try to get existing user first (id is the email in Amplify schema)
  const { data: existingUser } = await mockDatabaseClient.models.User.get({
    email: user.email,
  })

  if (existingUser) {
    // Update existing user if needed
    const { data: updatedUser } = await mockDatabaseClient.models.User.update({
      email: user.email,
      name: user.name,
      image: user.image,
    })
    return updatedUser!
  }

  // Create new user
  const { data: newUser } = await mockDatabaseClient.models.User.create({
    email: user.email,
    name: user.name,
    image: user.image,
  })
  return newUser!
}
