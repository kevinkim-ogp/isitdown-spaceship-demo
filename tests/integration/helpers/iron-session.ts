import { type NextApiRequest, type NextApiResponse } from 'next'
import {
  createMocks,
  createRequest,
  type RequestOptions,
  type ResponseOptions,
} from 'node-mocks-http'

import { type Session } from '~/lib/types/session'
import { UserData } from '~/models'
import { createContextInner, type Context } from '~/server/context'
import { auth } from './auth'

class MockIronStore {
  private static instance: MockIronStore

  private saved: { [key: string]: string | object | number }

  private unsaved: { [key: string]: string | object | number }

  private constructor() {
    this.saved = {}
    this.unsaved = {}
  }

  static getOrCreateStore(): MockIronStore {
    if (!MockIronStore.instance) {
      MockIronStore.instance = new MockIronStore()
    }
    return MockIronStore.instance
  }

  get(key: string) {
    return this.unsaved[key] || undefined
  }

  set(key: string, val: string | object | number) {
    this.unsaved[key] = val
  }

  unset(key: string) {
    delete this.unsaved[key]
  }

  seal() {
    this.saved = { ...this.unsaved }
  }

  clear() {
    this.unsaved = {}
  }
}

export const createMockRequest = async (
  session: Session,
  reqOptions: RequestOptions = { method: 'GET' },
): Promise<Context> => {
  const innerContext = await createContextInner({ session })

  const req = createRequest({
    ...reqOptions,
    headers: {
      'content-type': 'application/json', // will always be application/json
      ...reqOptions.headers,
    },
  })

  return {
    ...innerContext,
    req: req as unknown as Request,
    res: new Response(),
  }
}

export const applySession = () => {
  const store = MockIronStore.getOrCreateStore()

  const session = {
    set: store.set.bind(store),
    get: store.get.bind(store),
    unset: store.unset,
    async save() {
      store.seal()
    },
    destroy() {
      store.clear()
    },
  } as unknown as Session

  return session
}

export const applyAuthedSession = async (user: UserData) => {
  const authedUser = await auth(user)
  const session = applySession()
  session.userId = authedUser.email
  await session.save()
  return session
}
