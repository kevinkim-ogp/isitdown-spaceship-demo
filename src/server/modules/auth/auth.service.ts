import { env } from '~/env.mjs'
import { VerificationError } from './auth.error'
import { compareHash } from './auth.util'

// Import the in-memory store from auth.router
// We'll pass it as a parameter to avoid circular dependencies
export const verifyToken = async ({
  token,
  email,
  verificationTokens,
}: {
  token: string
  email: string
  verificationTokens: Map<string, {
    email: string
    token: string
    expires: string
    attempts: number
  }>
}) => {
  try {
    const originalToken = verificationTokens.get(email)

    if (!originalToken) {
      throw new VerificationError('Invalid login email')
    }

    // Update attempts
    const updatedToken = {
      ...originalToken,
      attempts: (originalToken.attempts || 0) + 1,
    }
    verificationTokens.set(email, updatedToken)

    if ((updatedToken.attempts || 0) > 5) {
      throw new VerificationError('Too many attempts')
    }

    if (
      (updatedToken.expires &&
        new Date(updatedToken.expires).valueOf() < Date.now()) ||
      !compareHash(token, email, updatedToken.token)
    ) {
      throw new VerificationError('Token is invalid or has expired')
    }

    // Delete token after successful verification
    verificationTokens.delete(email)

    return
  } catch (error) {
    if (error instanceof VerificationError) {
      throw error
    }
    throw new VerificationError('Verification failed')
  }
}
