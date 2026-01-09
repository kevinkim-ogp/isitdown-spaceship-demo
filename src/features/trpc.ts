import {
  httpLink,
  loggerLink,
  TRPCClientError,
  type TRPCLink,
} from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { type TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc'
import superjson from 'superjson'

import { TRPCWithErrorCodeSchema } from '~/utils/error'
import { LOCAL_STORAGE_EVENT, LOGGED_IN_KEY } from '~/constants/localStorage'
import {
  APP_VERSION_HEADER_KEY,
  REQUIRE_UPDATE_EVENT,
} from '~/constants/version'
import { env } from '~/env.mjs'
// ℹ️ Type-only import:
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export
import type { AppRouter } from '~/server/modules/app'

const NON_RETRYABLE_ERROR_CODES: Set<TRPC_ERROR_CODE_KEY> = new Set([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
])

export const versionLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          if (!value.context) {
            return observer.next(value)
          }
          const response = value.context.response as
            | Partial<Response> // Looser type for caution
            | undefined
          if (!response) {
            return observer.next(value)
          }
          const headers = response.headers
          if (!headers) {
            return observer.next(value)
          }
          const serverVersion = headers.get(APP_VERSION_HEADER_KEY)
          if (!serverVersion) {
            return observer.next(value)
          }
          const clientVersion = env.NEXT_PUBLIC_APP_VERSION
          if (clientVersion !== serverVersion) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event(REQUIRE_UPDATE_EVENT))
            }
          }
          return observer.next(value)
        },
        error(err) {
          observer.error(err)
        },
        complete() {
          observer.complete()
        },
      })
      return unsubscribe
    })
  }
}

export const custom401Link: TRPCLink<AppRouter> = () => {
  // here we just got initialized in the app - this happens once per app
  // useful for storing cache for instance
  return ({ next, op }) => {
    // this is when passing the result to the next link
    // each link needs to return an observable which propagates results
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value)
        },
        // Handle 401 errors
        error(err) {
          observer.error(err)
          if (window !== undefined && err?.data?.code === 'UNAUTHORIZED') {
            // Clear logged in state on localStorage
            // NOTE: This error is not handled in the /api/[trpc] API route as API routes are invoked
            // on the server and cannot perform redirections.
            // We can think of this handler function as a form of client side auth validity
            // handling, and the /api/[trpc] API route as a form of server side auth validity handling.
            window.localStorage.removeItem(LOGGED_IN_KEY)
            window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT))
          }
        },
        complete() {
          observer.complete()
        },
      })
      return unsubscribe
    })
  }
}

const isErrorRetryableOnClient = (error: unknown): boolean => {
  if (typeof window === 'undefined') return true
  if (!(error instanceof TRPCClientError)) return true
  const res = TRPCWithErrorCodeSchema.safeParse(error)
  return !res.success || !NON_RETRYABLE_ERROR_CODES.has(res.data)
}

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createTRPCReact`.
 * @link https://trpc.io/docs/react#3-create-trpc-hooks
 */
export const trpc = createTRPCReact<AppRouter>({
  unstable_overrides: {
    useMutation: {
      async onSuccess(opts) {
        /**
         * @note that order here matters:
         * The order here allows route changes in `onSuccess` without
         * having a flash of content change whilst redirecting.
         */
        // Calls the `onSuccess` defined in the `useQuery()`-options:
        await opts.originalFn()
        // Invalidate all queries in the react-query cache:
        await opts.queryClient.invalidateQueries()
      },
    },
  },
})

export function createTRPCClient() {
  return trpc.createClient({
    /**
     * @link https://trpc.io/docs/data-transformers
     */
    transformer: superjson,
    /**
     * @link https://trpc.io/docs/links
     */
    links: [
      versionLink,
      custom401Link,
      // adds pretty logs to your console in development and logs errors in production
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      httpLink({
        url: env.NEXT_PUBLIC_BASE_PATH
          ? `${env.NEXT_PUBLIC_BASE_PATH}/api`
          : `./api`,
        /**
         * Provide a function that will invoke the current global
         * window.fetch. We do this to pick up any changes to fetch
         * at runtime, eg, by Datadog RUM
         */
        fetch(url, options) {
          return fetch(url, options)
        },
        /**
         * Set custom request headers on every request from tRPC
         * @link https://trpc.io/docs/client/header
         */
        headers() {
          return {
            [APP_VERSION_HEADER_KEY]: env.NEXT_PUBLIC_APP_VERSION,
          }
        },
      }),
    ],
  })
}

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10, // 10 seconds
      retry: (failureCount: number, error: unknown) => {
        if (!isErrorRetryableOnClient(error)) return false
        return failureCount < 3
      },
    },
    mutations: {
      retry: false,
    },
  },
}

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>
