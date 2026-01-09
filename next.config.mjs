import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Read devDependencies from package.json at the top level
const devDependencies = Object.keys(
  require('./package.json').devDependencies || {},
)

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
const { env } = await import('./src/env.mjs')

const ContentSecurityPolicy = `
  default-src 'none';
  base-uri 'self';
  font-src 'self' https: data:;
  form-action 'self';
  frame-ancestors 'self';
  img-src 'self' data: blob:;
  frame-src 'self';
  object-src 'none';
  script-src 'self' 'unsafe-inline' ${['test', 'development'].includes(env.NODE_ENV) ? "'unsafe-eval'" : ''};
  style-src 'self' https: 'unsafe-inline';
  connect-src 'self';
  worker-src 'self' blob:;
  ${['test', 'development'].includes(env.NODE_ENV) ? '' : 'upgrade-insecure-requests'}
`

const basePath = env.NEXT_PUBLIC_BASE_PATH || ''

/**
 * @link https://nextjs.org/docs/api-reference/next.config.js/introduction
 */
/** @type {import("next").NextConfig} */
const config = {
  basePath,
  assetPrefix: basePath,
  serverExternalPackages: ['pino', 'pino-pretty'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        'pino',
        'pino-pretty',
        ...(Array.isArray(config.externals) ? config.externals : []),
        ...devDependencies, // externalize all devDependencies
      ]
    }
    return config
  },

  /** A Dockerfile could replace this with `output: "standalone"` to allow a custom server */
  output: undefined,
  reactStrictMode: true,
  /**
   * Dynamic configuration available for the browser and server.
   * Note: requires `ssr: true` or a `getInitialProps` in `_app.tsx`
   * @link https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration
   */
  publicRuntimeConfig: {
    NODE_ENV: env.NODE_ENV,
  },
  eslint: {
    ignoreDuringBuilds:
      !!process.env.CI || process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Origin-Agent-Cluster',
            value: '?1',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
}

export default config
