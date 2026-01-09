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
  // Get the cookie store instance to use throughout the request
  const cookieStore = await cookies()

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

  // Check if iron-session already set a Set-Cookie header in the response
  const existingSetCookie = response.headers.get('Set-Cookie')

  // Get the session cookie after the tRPC handler has run (and potentially saved the session)
  const sessionCookie = cookieStore.get('auth.session-token')

  // If there's a session cookie and iron-session didn't already set it, ensure it's in the response
  if (sessionCookie && !existingSetCookie) {
    const newResponse = new Response(response.body, response)
    // Include all cookie attributes - Max-Age is set by iron-session (7 days = 604800 seconds)
    const maxAge = 60 * 60 * 24 * 7 // 7 days in seconds
    const cookieValue = sessionCookie.value
    const cookieString = `auth.session-token=${cookieValue}; Path=/; HttpOnly; SameSite=lax; Max-Age=${maxAge}${
      isProd ? '; Secure' : ''
    }`
    newResponse.headers.set('Set-Cookie', cookieString)
    return newResponse
  }

  // If iron-session already set the cookie, return the response as-is
  // Otherwise, return the response (cookie might not exist if user is not logged in)
  return response
}

export { handler as GET, handler as POST }
