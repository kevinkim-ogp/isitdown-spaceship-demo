'use client'

import Link from 'next/link'
import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'

import { ServiceDashboard } from '~/components/ServiceDashboard'
import { APP_GRID_COLUMN, APP_PX } from '~/constants/layouts'
import { AppGrid } from '~/templates/AppGrid'

const AdminPage = () => {
  return (
    <AppGrid flex={1} bg="base.canvas.alt" px={APP_PX}>
      <Flex py="2rem" gridColumn={APP_GRID_COLUMN} flexDirection="column">
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
              <strong>Note:</strong> This dashboard shows detailed reports from
              public officers in the last 24 hours. You can click "I'm also facing
              this issue" to indicate you're experiencing the same problem.
            </Text>
          </Box>
        </Stack>
      </Flex>
    </AppGrid>
  )
}

export default AdminPage
