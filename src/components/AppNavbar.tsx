'use client'

import NextLink from 'next/link'
import { Flex, HStack } from '@chakra-ui/react'
import { AvatarMenu, Link, Menu } from '@opengovsg/design-system-react'

import { APP_NAME } from '~/constants/branding'
import { APP_PX } from '~/constants/layouts'
import { useMe } from '~/features/me'
import { ADMIN } from '~/lib/routes'

export const AppNavbar = (): JSX.Element => {
  const { me, logout } = useMe()

  return (
    <Flex flex="0 0 auto" gridColumn="1/-1">
      <Flex
        w="100%"
        justify="space-between"
        align="center"
        px={APP_PX}
        py="0.375rem"
        bg="white"
        borderBottomWidth="1px"
        borderColor="base.divider.medium"
        transition="padding 0.1s"
      >
        <Link
          as={NextLink}
          href={ADMIN}
          mx={{ base: 'auto', sm: 0 }}
          transition="margin 0.1s"
          textDecoration="none"
        >
          {APP_NAME}
        </Link>
        <HStack
          textStyle="subhead-1"
          spacing={{ base: '0.75rem', md: '1.5rem' }}
        >
          <AvatarMenu
            src={me?.image ?? undefined}
            name={me?.name ?? undefined}
            variant="subtle"
            bg="base.canvas.brand-subtle"
            menuListProps={{ maxWidth: '19rem' }}
          >
            <Menu.Item onClick={() => logout()}>Sign out</Menu.Item>
          </AvatarMenu>
        </HStack>
      </Flex>
    </Flex>
  )
}
