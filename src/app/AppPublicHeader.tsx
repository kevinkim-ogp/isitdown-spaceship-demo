'use client'

import { type ComponentType } from 'react'
import NextLink from 'next/link'
import { Flex, HStack } from '@chakra-ui/react'
import {
  AvatarMenu,
  Button,
  IconButton,
  Link,
  Menu,
  useIsMobile,
} from '@opengovsg/design-system-react'

import { APP_NAME } from '~/constants/branding'
import { useAuth } from '~/features/auth'
import { trpc } from '~/features/trpc'
import { SIGN_IN } from '~/lib/routes'
import { AppGrid } from '~/templates/AppGrid'

type PublicHeaderLinkProps = {
  label: string
  href: string
  showOnMobile?: boolean
  MobileIcon?: ComponentType
}

export interface AppPublicHeaderProps {
  /** Header links to display, if provided. */
  publicHeaderLinks?: PublicHeaderLinkProps[]

  /** Whether the sign-in button should be shown */
  enableSignIn?: boolean
}

const PublicHeaderLink = ({
  showOnMobile,
  MobileIcon,
  href,
  label,
}: PublicHeaderLinkProps) => {
  const isMobile = useIsMobile()

  if (isMobile && !showOnMobile) {
    return null
  }

  if (isMobile && MobileIcon) {
    return (
      <IconButton
        variant="clear"
        as={NextLink}
        href={href}
        aria-label={label}
        icon={<MobileIcon />}
        fontSize="1.25rem"
        color="primary.500"
      />
    )
  }

  return (
    <Link
      as={NextLink}
      w="fit-content"
      variant="standalone"
      color="primary.500"
      href={href}
      aria-label={label}
    >
      {label}
    </Link>
  )
}

const AuthenticatedUserMenu = () => {
  const { data: me } = trpc.me.get.useQuery(undefined, {
    enabled: true,
  })
  const { removeAuthFlag } = useAuth()
  const logoutMutation = trpc.auth.logout.useMutation()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        removeAuthFlag()
        window.location.href = '/'
      },
    })
  }

  return (
    <AvatarMenu
      src={me?.image ?? undefined}
      name={me?.name ?? undefined}
      variant="subtle"
      bg="base.canvas.brand-subtle"
      menuListProps={{ maxWidth: '19rem' }}
    >
      <Menu.Item onClick={handleLogout}>Sign out</Menu.Item>
    </AvatarMenu>
  )
}

export const AppPublicHeader = ({
  publicHeaderLinks,
  enableSignIn = true,
}: AppPublicHeaderProps): JSX.Element => {
  const { hasAuthFlag } = useAuth()

  return (
    <AppGrid px="1.5rem" bg="base.canvas.brand-subtle">
      <Flex
        gridColumn={{ base: '1 / -1', md: '2 / 12' }}
        justify="space-between"
        align="center"
        py={{ base: '0.625rem', md: '2.5rem' }}
      >
        <NextLink href="/">{APP_NAME}</NextLink>
        <HStack
          textStyle="subhead-1"
          spacing={{ base: '1rem', md: '2rem', xl: '2.5rem' }}
        >
          {publicHeaderLinks?.map((link, index) => (
            <PublicHeaderLink key={index} {...link} />
          ))}
          {hasAuthFlag ? (
            <AuthenticatedUserMenu />
          ) : (
            enableSignIn && (
              <Button variant="solid" as={NextLink} href={SIGN_IN}>
                Log in
              </Button>
            )
          )}
        </HStack>
      </Flex>
    </AppGrid>
  )
}
