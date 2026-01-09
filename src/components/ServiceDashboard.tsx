'use client'

import { useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Spinner,
  Stack,
  Tag,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'

import { useAuth } from '~/features/auth'
import { trpc } from '~/features/trpc'

const SERVICE_NAMES: Record<string, string> = {
  plumber: 'Plumber (OTP Login)',
  singpass: 'SingPass Login',
  corppass: 'CorpPass Login',
}

const ISSUE_TYPE_NAMES: Record<string, string> = {
  cannot_login: 'Cannot log in',
  otp_not_received: 'OTP not received',
  otp_delayed: 'OTP delayed',
  service_slow: 'Service slow',
  service_down: 'Service down',
  other: 'Other',
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  cannot_login: 'red',
  otp_not_received: 'orange',
  otp_delayed: 'yellow',
  service_slow: 'blue',
  service_down: 'red',
  other: 'gray',
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return 'More than a day ago'
}

function getSeverityColor(reportCount: number): string {
  if (reportCount >= 10) return 'red.500'
  if (reportCount >= 5) return 'orange.500'
  if (reportCount >= 2) return 'yellow.600'
  return 'blue.500'
}

export function ServiceDashboard() {
  const { hasAuthFlag } = useAuth()
  console.log('hasAuthFlag', hasAuthFlag)
  const toast = useToast()

  const {
    data: services,
    isLoading,
    refetch,
  } = trpc.reports.getDashboard.useQuery()
  console.log('services', services)
  const meTooMutation = trpc.reports.reportMeToo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description: 'Your report has been added to this issue.',
        status: 'success',
        duration: 3000,
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    },
  })

  const handleMeToo = (reportId: string) => {
    meTooMutation.mutate({ reportId })
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 30000)

    return () => clearInterval(interval)
  }, [refetch])

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    )
  }

  if (!services || services.length === 0) {
    return (
      <Card>
        <CardBody>
          <VStack spacing={4} py={8}>
            <Text fontSize="4xl">✅</Text>
            <Heading size="md" color="green.600">
              All Systems Operational
            </Heading>
            <Text color="gray.600" textAlign="center">
              No service issues have been reported in the last 24 hours.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    )
  }

  return (
    <Stack spacing={4}>
      {services.map((service) => {
        const severityColor = getSeverityColor(service.totalReports)
        console.log('service', service)

        return (
          <Card
            key={service.id || service.service}
            borderLeft="4px solid"
            borderLeftColor={severityColor}
            shadow="md"
          >
            <CardBody>
              <Stack spacing={4}>
                <Flex justify="space-between" align="start" wrap="wrap" gap={2}>
                  <Box flex={1}>
                    <Heading size="md" mb={1}>
                      {service.detailedDescription ||
                        SERVICE_NAMES[service.service] ||
                        service.service}
                    </Heading>
                    {hasAuthFlag &&
                      service.agencies &&
                      service.agencies.length > 0 && (
                        <HStack spacing={2} mb={2} flexWrap="wrap">
                          {service.agencies.map((agency) => (
                            <Tag key={agency} size="sm" colorScheme="purple">
                              {agency}
                            </Tag>
                          ))}
                        </HStack>
                      )}
                    <Text fontSize="sm" color="gray.600">
                      Last reported: {formatTimeAgo(service.mostRecentReport)}
                    </Text>
                  </Box>
                  <Tag
                    size="lg"
                    colorScheme={
                      service.totalReports >= 10
                        ? 'red'
                        : service.totalReports >= 5
                          ? 'orange'
                          : service.totalReports >= 2
                            ? 'yellow'
                            : 'blue'
                    }
                    fontWeight="bold"
                  >
                    {service.totalReports} {hasAuthFlag ? 'officer' : 'report'}
                    {service.totalReports !== 1 ? 's' : ''}
                  </Tag>
                </Flex>

                {hasAuthFlag && (
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      mb={2}
                      color="gray.700"
                    >
                      Issue breakdown:
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {Object.entries(service.issueBreakdown).map(
                        ([issueType, count]) => (
                          <Tag
                            key={issueType}
                            size="sm"
                            colorScheme={ISSUE_TYPE_COLORS[issueType] || 'gray'}
                          >
                            {ISSUE_TYPE_NAMES[issueType] || issueType}: {count}
                          </Tag>
                        ),
                      )}
                    </HStack>
                  </Box>
                )}

                {hasAuthFlag && service.id && (
                  <Flex justify="flex-end">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleMeToo(service.id!)}
                      isLoading={meTooMutation.isPending}
                      isDisabled={!hasAuthFlag}
                    >
                      I'm also facing this issue
                    </Button>
                  </Flex>
                )}
              </Stack>
            </CardBody>
          </Card>
        )
      })}
    </Stack>
  )
}
