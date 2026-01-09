'use client'

import { Flex } from '@chakra-ui/react'

import { AppNavbar } from '~/components/AppNavbar'
import { EnforceLoginStatePageWrapper } from '~/components/AuthWrappers'

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <EnforceLoginStatePageWrapper>
      <Flex minH="$100vh" flexDir="column" bg="base.canvas.alt" pos="relative">
        <AppNavbar />
        <Flex flex={1} bg="base.canvas.alt">
          {children}
        </Flex>
      </Flex>
    </EnforceLoginStatePageWrapper>
  )
}

export default AdminLayout
