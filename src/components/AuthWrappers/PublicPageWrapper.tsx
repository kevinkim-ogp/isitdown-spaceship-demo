'use client'

import { type PropsWithChildren } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { CALLBACK_URL_KEY } from '~/constants/params'
import { useAuth } from '~/features/auth'
import { callbackUrlSchema } from '~/schemas/url'
import { FullscreenSpinner } from '../FullscreenSpinner'

type PublicPageWrapperProps =
  | { strict: true; redirectUrl?: string }
  | { strict: false }

/**
 * Page wrapper that renders children only if the login cookie is NOT found.
 * Otherwise, will redirect to the route passed into the `CALLBACK_URL_KEY` URL parameter.
 *
 * @note There is no authentication being performed by this component. This component is merely a wrapper that checks for the presence of the login flag in localStorage.
 */
export const PublicPageWrapper = ({
  children,
  ...rest
}: PropsWithChildren<PublicPageWrapperProps>): JSX.Element => {
  const router = useRouter()
  const query = useSearchParams()
  const { hasAuthFlag } = useAuth()

  if (hasAuthFlag && rest.strict) {
    if (rest.redirectUrl) {
      void router.push(callbackUrlSchema.parse(rest.redirectUrl).toString())
    } else {
      const callbackUrl = query?.get(CALLBACK_URL_KEY) ?? undefined
      void router.push(callbackUrlSchema.parse(callbackUrl).toString())
    }
    return <FullscreenSpinner />
  }

  return <>{children}</>
}
