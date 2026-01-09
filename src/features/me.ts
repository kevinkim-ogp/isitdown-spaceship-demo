import { useCallback } from 'react'
import Router from 'next/router'

import { useAuth } from '~/features/auth'
import { trpc } from '~/features/trpc'

export const useMe = () => {
  const [me] = trpc.me.get.useSuspenseQuery()

  const { removeAuthFlag } = useAuth()
  const logoutMutation = trpc.auth.logout.useMutation()

  const logout = useCallback(
    (redirectToSignIn = true) => {
      return logoutMutation.mutate(undefined, {
        onSuccess: async () => {
          removeAuthFlag()
          if (redirectToSignIn) {
            await Router.push('/sign-in')
          }
        },
      })
    },
    [logoutMutation, removeAuthFlag],
  )

  return { me, logout }
}
