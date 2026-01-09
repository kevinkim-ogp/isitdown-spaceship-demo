import { type SessionOptions } from 'iron-session'

import { env } from '~/env.mjs'

export const sessionOptions: SessionOptions = {
  password: {
    '1': env.SESSION_SECRET,
  },
  cookieName: 'auth.session-token',
  ttl: 60 * 60 * 24 * 7, // 7 days
  cookieOptions: {
    // In development, secure=false allows direct HTTP access to work
    // In production, secure=true is required for sameSite: 'none'
    // Note: If testing reverse proxy in dev over HTTPS, you may need to temporarily
    // set secure: true or use production mode
    secure:
      env.NODE_ENV !== 'development' &&
      env.NODE_ENV !== 'test' &&
      env.IS_SPACESHIP_PREVIEW !== true,
    // When served via reverse proxy, the proxy strips the base path before forwarding
    // to this app, so the cookie path should be '/' not the NEXT_PUBLIC_BASE_PATH
    // The base path is only for Next.js routing, not for the actual HTTP paths
    path: '/',
    // For reverse proxy: use 'lax' for same-site, 'none' for cross-site
    // If parent app is on different domain, use 'none' (requires secure: true)
    sameSite: 'lax',
    // Ensure httpOnly is set for security (prevent XSS access to session cookie)
    httpOnly: true,
  },
}
