import { TRPCError } from '@trpc/server'

import { type DefaultMeSelect } from '~/server/modules/me/me.select'
import { trpcMsw } from '../mockTrpc'

export const defaultUser: DefaultMeSelect = {
  email: 'test@example.com',
  image: null,
  name: 'Test User',
}

const defaultMeGetQuery = () => {
  return trpcMsw.me.get.query(() => {
    return defaultUser
  })
}

const unauthorizedMeGetQuery = () => {
  return trpcMsw.me.get.query(() => {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  })
}

export const meHandlers = {
  me: defaultMeGetQuery,
  unauthorized: unauthorizedMeGetQuery,
}
