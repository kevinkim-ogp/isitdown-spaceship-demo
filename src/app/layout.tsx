import { type Metadata } from 'next'

import { AppLayout } from '~/components/AppLayout'
import { APP_NAME } from '~/constants/branding'
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { env } from '~/env.mjs'
import { safeInitializeDatabase } from '~/lib/dynamodb'

export const metadata: Metadata = {
  title: APP_NAME,
  icons: '/favicon.ico',
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  // Initialize database on app startup
  await safeInitializeDatabase()

  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}

export default RootLayout
