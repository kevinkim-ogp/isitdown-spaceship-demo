import { TZDate } from '@date-fns/tz'
import { TRPCError } from '@trpc/server'
import { format } from 'date-fns/format'

import { getBaseUrl } from '~/utils/getBaseUrl'
import { APP_NAME } from '~/constants/branding'
import { env } from '~/env.mjs'
import { sendMail } from '~/lib/mail'
import { emailSignInSchema, emailVerifyOtpSchema } from '~/schemas/auth'
import { publicProcedure, router } from '~/server/trpc'
import { VerificationError } from './auth.error'
import { verifyToken } from './auth.service'
import { createTokenHash, createVfnPrefix, createVfnToken } from './auth.util'
import { users } from './users.store'

// In-memory stores (replaces database)
const verificationTokens = new Map<
  string,
  {
    email: string
    token: string
    expires: string
    attempts: number
  }
>()

export const authRouter = router({
  // Sign in directly (demo mode - no OTP verification)
  login: publicProcedure
    .input(emailSignInSchema)
    .mutation(async ({ input: { email }, ctx }) => {
      console.log('login', email)

      const emailName = email.split('@')[0] ?? 'unknown'

      // Get or create user in memory
      let user = users.get(email)

      if (!user) {
        user = {
          email,
          name: emailName,
        }
        users.set(email, user)
      }

      // Sign user in immediately
      ctx.session.userId = user.email
      await ctx.session.save()

      return user
    }),

  verifyOtp: publicProcedure
    .input(emailVerifyOtpSchema)
    .mutation(async ({ ctx, input: { email, token } }) => {
      try {
        await verifyToken({ token, email, verificationTokens })
      } catch (e) {
        if (e instanceof VerificationError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: e.message,
            cause: e,
          })
        }
        throw e
      }

      const emailName = email.split('@')[0] ?? 'unknown'

      // Get or create user in memory
      let user = users.get(email)

      if (!user) {
        user = {
          email,
          name: emailName,
        }
        users.set(email, user)
      }

      ctx.session.userId = user.email
      await ctx.session.save()
      return user
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear userId instead of destroying session to avoid affecting host app cookies
    delete ctx.session.userId
    await ctx.session.save()
    return { isLoggedIn: false }
  }),
})
