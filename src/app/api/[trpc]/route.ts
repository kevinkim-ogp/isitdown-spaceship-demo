/**
 * This file contains tRPC's HTTP response handler
 */
import { cookies } from 'next/headers'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { env } from '~/env.mjs'
import { createContext } from '~/server/context'
import { appRouter } from '~/server/modules/app'

const isProd = env.NODE_ENV === 'production' && env.IS_SPACESHIP_PREVIEW == true

const handler = async (req: Request) => {
  // Call the tRPC handler
  const response = await fetchRequestHandler({
    endpoint: '/api',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    /**
     * @link https://trpc.io/docs/error-handling
     */
    onError: ({ error, ctx }) => {
      // Don't destroy the session to avoid affecting the host app's cookies
      // when served via reverse proxy. Just clear the userId if needed.
      if (error.code === 'UNAUTHORIZED' && ctx?.session?.userId) {
        delete ctx.session.userId
        // Note: We intentionally don't call ctx.session.destroy() to avoid
        // cookie deletion issues when this app is served via reverse proxy
      }
    },
    batching: {
      /**
       * Disable query batching for better logging (and since we mostly self-host the app without Serverless)
       */
      enabled: false,
    },
  })

  // Get cookies that were modified during the request
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('auth.session-token')

  // If there's a session cookie, ensure it's in the response
  if (sessionCookie) {
    const newResponse = new Response(response.body, response)
    newResponse.headers.set(
      'Set-Cookie',
      `${sessionCookie.name}=${sessionCookie.value}; Path=/; HttpOnly; SameSite=lax${
        isProd ? '; Secure' : ''
      }`,
    )
    return newResponse
  }

  return response
}

export { handler as GET, handler as POST }
