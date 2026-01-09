'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormControl, Stack } from '@chakra-ui/react'
import {
  Button,
  FormErrorMessage,
  FormLabel,
  Input,
} from '@opengovsg/design-system-react'

import { CALLBACK_URL_KEY } from '~/constants/params'
import { useAuth } from '~/features/auth'
import { trpc } from '~/features/trpc'
import { callbackUrlSchema } from '~/schemas/url'
import { useZodForm } from '~/lib/form'
import { emailSignInSchema } from '~/schemas/auth'

export const EmailInput: React.FC = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm({
    schema: emailSignInSchema,
  })

  const query = useSearchParams()
  const router = useRouter()
  const { setHasAuthFlag } = useAuth()
  const utils = trpc.useUtils()

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setHasAuthFlag()
      await utils.me.get.invalidate()
      // Redirect to callback URL or homepage
      const callbackUrl = query?.get(CALLBACK_URL_KEY) ?? undefined
      if (callbackUrl) {
        // Parse the callback URL and extract the pathname
        const parsedUrl = callbackUrlSchema.parse(callbackUrl)
        const pathname = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash
        router.push(pathname)
      } else {
        // Default to homepage
        router.push('/')
      }
    },
    onError: (error) => setError('email', { message: error.message }),
  })

  useEffect(() => {
    const error = query?.get('error')
    if (error) {
      setError('email', { message: error })
    }
  }, [query, setError])

  const handleSignIn = handleSubmit(({ email }) => {
    return loginMutation.mutate({ email })
  })

  return (
    <form onSubmit={handleSignIn} noValidate>
      <Stack spacing="1rem">
        <FormControl
          id="email"
          isRequired
          isInvalid={!!errors.email}
          isReadOnly={loginMutation.isLoading}
        >
          <FormLabel>
            Log in with a .gov.sg or whitelisted email address
          </FormLabel>
          <Input
            placeholder="e.g. jane@open.gov.sg"
            autoFocus
            {...register('email')}
          />
          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>
        <Button
          size="xs"
          height="2.75rem"
          type="submit"
          isLoading={loginMutation.isLoading || loginMutation.isSuccess}
        >
          Sign in
        </Button>
      </Stack>
    </form>
  )
}
