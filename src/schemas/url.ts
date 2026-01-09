import { createUrlSchema } from '@opengovsg/starter-kitty-validators/url'
import { z } from 'zod'

import { getBaseUrl } from '~/utils/getBaseUrl'
import { env } from '~/env.mjs'
import { ADMIN } from '~/lib/routes'

const baseUrl = new URL(getBaseUrl())

const urlSchema = createUrlSchema({
  baseOrigin: baseUrl.origin,
  whitelist: {
    protocols: ['http', 'https'],
    hosts: [baseUrl.host],
  },
})

const getDefaultPath = () => {
  return env.NEXT_PUBLIC_BASE_PATH ? `${env.NEXT_PUBLIC_BASE_PATH}/` : '/'
}

export const callbackUrlSchema = z
  .string()
  .optional()
  .default(getDefaultPath())
  .transform((val, ctx) => {
    try {
      return urlSchema.parse(val)
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'URL validation error',
      })
      return z.NEVER
    }
  })
  .catch(new URL(getDefaultPath(), baseUrl.origin))
