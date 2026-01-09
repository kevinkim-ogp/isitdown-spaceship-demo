import { z } from 'zod'

// Coerces a string to true if it's "true", false if "false".
const coerceBoolean = z
  .string()
  // only allow "true" or "false" or empty string
  .refine((s) => s === 'true' || s === 'false' || s === '')
  // transform to boolean
  .transform((s) => s === 'true')
  // make sure tranform worked
  .pipe(z.boolean())

/**
 * Specify your client-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars. To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
const client = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Starter Kit'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('0.0.0'),
  NEXT_PUBLIC_BASE_PATH: z.string().optional(),
})

/**
 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars.
 */
const server = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    OTP_EXPIRY: z.coerce.number().positive().optional().default(600),
    POSTMAN_API_KEY: z.string().optional(),
    PAIR_FOUNDRY_API_KEY: z.string().optional(),
    SESSION_SECRET: z.string().min(32),
    IS_SPACESHIP_PREVIEW: z
      .string()
      .optional()
      .default('')
      .transform((s) => s === '1' || s === 'true')
      .pipe(z.boolean()),
  })
  // Add on schemas as needed that requires conditional validation.
  .merge(client)

/**
 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
 * middlewares) or client-side so we need to destruct manually.
 * Intellisense should work due to inference.
 *
 * @type {Record<keyof z.infer<typeof server> | keyof z.infer<typeof client>, string | undefined>}
 */
const processEnv = {
  // Server-side env vars
  NODE_ENV: process.env.NODE_ENV,
  OTP_EXPIRY: process.env.OTP_EXPIRY,
  POSTMAN_API_KEY: process.env.POSTMAN_API_KEY,
  PAIR_FOUNDRY_API_KEY: process.env.PAIR_FOUNDRY_API_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
  IS_SPACESHIP_PREVIEW: process.env.IS_SPACESHIP_PREVIEW,
  // Client-side env vars
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
}

// Don't touch the part below
// --------------------------
/** @typedef {z.input<typeof server>} MergedInput */
/** @typedef {z.infer<typeof server>} MergedOutput */
/** @typedef {z.SafeParseReturnType<MergedInput, MergedOutput>} MergedSafeParseReturn */

// @ts-expect-error Types are wonky from refinement
let env = /** @type {MergedOutput} */ (process.env)

if (!!process.env.SKIP_ENV_VALIDATION == false) {
  const isBuild = !!process.env.BUILD_MODE // Allows building of docker image without server-side env validation
  const isServer = typeof window === 'undefined'

  const parsed = /** @type {MergedSafeParseReturn} */ (
    isServer && !isBuild
      ? server.safeParse(processEnv) // on server we can validate all env vars
      : client.safeParse(processEnv) // on client we can only validate the ones that are exposed
  )

  if (parsed.success === false) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors,
    )
    throw new Error('Invalid environment variables')
  }

  env = new Proxy(parsed.data, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined
      // Throw a descriptive error if a server-side env var is accessed on the client
      // Otherwise it would just be returning `undefined` and be annoying to debug
      if (!isServer && !prop.startsWith('NEXT_PUBLIC_'))
        throw new Error(
          ['test', 'development'].includes(process.env.NODE_ENV)
            ? `❌ Attempted to access server-side environment variable '${prop}' on the client`
            : '❌ Attempted to access a server-side environment variable on the client',
        )
      return target[/** @type {keyof typeof target} */ (prop)]
    },
  })
}

export { env }
