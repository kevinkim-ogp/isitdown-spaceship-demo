'use client'

import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { useIsMobile } from '@opengovsg/design-system-react'
import Link from 'next/link'

import { AppFooter } from '~/components/AppFooter'
import { ServiceDashboard } from '~/components/ServiceDashboard'
import { AppGrid } from '~/templates/AppGrid'
import { AppPublicHeader } from './AppPublicHeader'
import { LandingSection } from './LandingSection'

const LandingPage = () => {
  const isMobile = useIsMobile()

  return (
    <Flex flexDirection="column" minH="100vh" bg="base.canvas.brand-subtle">
      <AppPublicHeader enableSignIn={true} />

      <Flex flexDirection="column" flex={1}>
        <LandingSection
          bg="base.canvas.brand-subtle"
          pt={{ base: '2rem', md: 0 }}
          px={0}
        >
          <Stack spacing={6}>
            <Box textAlign="center" mb={4}>
              <Heading
                as="h1"
                size={{ base: 'xl', md: '2xl' }}
                color="base.content.strong"
                mb={2}
              >
                Service Status Tracker
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600" mb={4}>
                Real-time status of government authentication services
              </Text>
              <Link href="/report" passHref>
                <Button colorScheme="blue" size="lg">
                  Report an Issue
                </Button>
              </Link>
            </Box>

            <Box>
              <Heading size="md" mb={4} color="base.content.strong">
                Service Status (Last 24 Hours)
              </Heading>
              <ServiceDashboard />
            </Box>

            <Box
              bg="blue.50"
              p={4}
              borderRadius="md"
              borderLeft="4px solid"
              borderLeftColor="blue.500"
            >
              <Text fontSize="sm" color="gray.700">
                <strong>Note:</strong> This dashboard shows issues reported by public
                officers in the last 24 hours. Services are sorted by the number of
                reports received. If you're experiencing issues, please sign in to
                report them.
              </Text>
            </Box>
          </Stack>
        </LandingSection>
      </Flex>

      <AppGrid bg="base.canvas.brand-subtle" px="1.5rem">
        <Box gridColumn={{ base: '1 / -1', md: '2 / 12' }}>
          <AppFooter containerProps={{ px: 0 }} />
        </Box>
      </AppGrid>
    </Flex>
  )
}

export default LandingPage
