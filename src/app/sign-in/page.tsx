'use client'

import { Flex } from '@chakra-ui/react'
import { RestrictedGovtMasthead } from '@opengovsg/design-system-react'

import { PublicPageWrapper } from '~/components/AuthWrappers'
import { RestrictedMiniFooter } from '~/components/RestrictedMiniFooter'
import {
  BaseGridLayout,
  FooterGridArea,
  LoginGridArea,
  NonMobileFooterLeftGridArea,
  NonMobileSidebarGridArea,
} from './GridLayout'
import { LoginImageSvgr } from './LoginImageSvgr'
import { CurrentLoginStep } from './LoginStep'
import { SignInContextProvider } from './SignInContext'

const SignIn = () => {
  return (
    <PublicPageWrapper strict>
      <Flex flexDir="column" h="inherit" minH="$100vh">
        <RestrictedGovtMasthead />
        <BaseGridLayout flex={1}>
          <NonMobileSidebarGridArea>
            <LoginImageSvgr aria-hidden />
          </NonMobileSidebarGridArea>
          <LoginGridArea>
            <SignInContextProvider>
              <CurrentLoginStep />
            </SignInContextProvider>
          </LoginGridArea>
          <NonMobileFooterLeftGridArea />
        </BaseGridLayout>
      </Flex>
    </PublicPageWrapper>
  )
}

export default SignIn
