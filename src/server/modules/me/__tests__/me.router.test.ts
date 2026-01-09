import { clearTestData } from '~tests/integration/helpers/auth'
import {
  applyAuthedSession,
  createMockRequest,
  type applySession,
} from '~tests/integration/helpers/iron-session'

import { UserData } from '~/models'
import { createCallerFactory } from '~/server/trpc'
import { meRouter } from '../me.router'
import { type DefaultMeSelect } from '../me.select'

const createCaller = createCallerFactory(meRouter)

const TEST_USER: UserData = {
  email: 'test@example.com',
  name: 'Test User',
  image: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const EXPECTED_TRANSFORMED_USER: DefaultMeSelect = {
  email: 'test@example.com',
  name: 'Test User',
  image: '',
}

describe('auth.email', async () => {
  let caller: Awaited<ReturnType<typeof createCaller>>
  let session: ReturnType<typeof applySession>

  beforeEach(async () => {
    // clearTestData()
    session = await applyAuthedSession(TEST_USER)
    const ctx = await createMockRequest(session)
    caller = createCaller(ctx)
  })

  describe('get', async () => {
    it('should return the user', async () => {
      // Act
      const result = await caller.get()

      // Assert
      expect(result).toEqual(EXPECTED_TRANSFORMED_USER)
    })
  })
})
