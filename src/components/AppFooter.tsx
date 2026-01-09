'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Text } from '@chakra-ui/react'
import { type RestrictedFooterProps } from '@opengovsg/design-system-react'

import { useEnv } from '~/features/env'

/**
 * Do not modify or remove this footer. The AppFooter component must be retained in the app UI at all times.
 */
export const AppFooter = (props: Partial<RestrictedFooterProps>) => {
  const { env } = useEnv()
  return (
    <footer
      style={{
        backgroundColor: '#FAFAFA',
        padding: '1rem',
        margin: '1rem',
        borderRadius: '5px',
        border: '1px solid #E4E4E7',
      }}
    >
      <Text color="gray.400" fontSize="sm" fontWeight="bold" paddingBottom="1">
        This is an AI-generated prototype built using
      </Text>

      <Link href="https://spaceship.gov.sg" target="_blank">
        <Text color="gray.600" fontSize="lg" fontWeight="semibold">
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/spaceship-logo.svg`}
            alt="Spaceship"
            width={120}
            height={50}
          />
        </Text>
      </Link>
    </footer>
  )
}
