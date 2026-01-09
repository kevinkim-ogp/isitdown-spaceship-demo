'use client'

import { useMemo, type PropsWithChildren } from 'react'
import { useRouter } from 'next/navigation'

import { appendWithRedirect } from '~/utils/url'
import { env } from '~/env.mjs'
import { useAuth } from '~/features/auth'
import { SIGN_IN } from '~/lib/routes'
import { callbackUrlSchema } from '~/schemas/url'
import { FullscreenSpinner } from '../FullscreenSpinner'

interface EnforceLoginStatePageWrapperProps {
  /**
   * Route to redirect to when user is not authenticated. Defaults to
   * `SIGN_IN` route if not provided.
   */
  redirectTo?: string
}

const Redirect = ({
  redirectTo = SIGN_IN,
}: EnforceLoginStatePageWrapperProps) => {
  const router = useRouter()
  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/'
    const { pathname, search, hash } = window.location
    return `${pathname}${search}${hash}`
  }, [])

  void router.push(
    callbackUrlSchema
      .parse(appendWithRedirect(redirectTo, redirectUrl))
      .toString(),
  )

  return <FullscreenSpinner />
}

/**
 * Page wrapper that renders children only if the login state localStorage flag has been set.
 * Otherwise, will redirect to the route passed into the `redirectTo` prop.
 *
 * @note 🚨 There is no authentication being performed by this component. This component is merely a wrapper that checks for the presence of the login flag in localStorage. This means that a user could add the flag and bypass the check. Any page children that require authentication should also perform authentication checks in that page itself!
 */
export const EnforceLoginStatePageWrapper = ({
  redirectTo = SIGN_IN,
  children,
}: PropsWithChildren<EnforceLoginStatePageWrapperProps>): React.ReactElement => {
  const { hasAuthFlag } = useAuth()

  if (hasAuthFlag) {
    return <>{children}</>
  }

  return (
    <Redirect
      redirectTo={
        env.NEXT_PUBLIC_BASE_PATH
          ? `${env.NEXT_PUBLIC_BASE_PATH}${redirectTo}`
          : redirectTo
      }
    />
  )
}
