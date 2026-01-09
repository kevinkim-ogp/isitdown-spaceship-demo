import { cookies } from 'next/headers'
import type * as trpc from '@trpc/server'
import { getIronSession } from 'iron-session'

import { type Session, type SessionData } from '~/lib/types/session'
import { sessionOptions } from './modules/auth/session'
import { type DefaultMeSelect } from './modules/me/me.select'

interface CreateContextOptions {
  session?: Session
  user?: DefaultMeSelect
}

/**
 * Inner function for `createContext` where we create the context.
 * This is useful for testing when we don't want to mock Next.js' request/response
 */
export async function createContextInner(opts: CreateContextOptions) {
  return {
    session: opts.session,
  }
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({
  req,
  res,
}: {
  req: Request
  res?: Response
}) => {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  )

  const innerContext = await createContextInner({
    session,
  })

  return {
    ...innerContext,
    req,
    res,
  }
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>
