'use client'

import { Stack, Text } from '@chakra-ui/react'

import { APP_NAME } from '~/constants/branding'
import { EmailLoginForm } from '../EmailLogin'

export const InitialLoginStep = (): JSX.Element => {
  return (
    <Stack gap="2rem" direction="column" width="100%">
      <Text color="base.content.brand" textStyle="h3-semibold">
        {APP_NAME}
      </Text>
      <EmailLoginForm />
    </Stack>
  )
}
