'use client'

import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppFooter } from '~/components/AppFooter'
import { AppGrid } from '~/templates/AppGrid'
import { trpc } from '~/features/trpc'

const SERVICE_OPTIONS = [
  { value: 'plumber', label: 'Plumber (OTP Login)' },
  { value: 'singpass', label: 'SingPass Login' },
  { value: 'corppass', label: 'CorpPass Login' },
]

const ISSUE_TYPE_OPTIONS = [
  { value: 'cannot_login', label: 'Cannot log in' },
  { value: 'otp_not_received', label: 'OTP not received' },
  { value: 'otp_delayed', label: 'OTP delayed' },
  { value: 'service_slow', label: 'Service slow' },
  { value: 'service_down', label: 'Service down' },
  { value: 'other', label: 'Other' },
]

function ReportForm() {
  const router = useRouter()
  const toast = useToast()
  const [service, setService] = useState('')
  const [issueType, setIssueType] = useState('')
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submitReportMutation = trpc.reports.submitReport.useMutation({
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description:
          "Thank you for reporting this issue. We'll send you a follow-up email in about an hour.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      router.push('/')
    },
    onError: (error) => {
      toast({
        title: 'Error submitting report',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors: Record<string, string> = {}
    if (!service) newErrors.service = 'Please select a service'
    if (!issueType) newErrors.issueType = 'Please select an issue type'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    submitReportMutation.mutate({
      service: service as 'plumber' | 'singpass' | 'corppass',
      issueType: issueType as
        | 'cannot_login'
        | 'otp_not_received'
        | 'otp_delayed'
        | 'service_slow'
        | 'service_down'
        | 'other',
      comment: comment || undefined,
    })
  }

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={6} align="stretch">
        <FormControl isInvalid={!!errors.service} isRequired>
          <FormLabel fontWeight="semibold">Which service are you having issues with?</FormLabel>
          <RadioGroup value={service} onChange={setService}>
            <Stack spacing={3}>
              {SERVICE_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value} size="lg">
                  {option.label}
                </Radio>
              ))}
            </Stack>
          </RadioGroup>
          <FormErrorMessage>{errors.service}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.issueType} isRequired>
          <FormLabel fontWeight="semibold">What type of issue are you experiencing?</FormLabel>
          <RadioGroup value={issueType} onChange={setIssueType}>
            <Stack spacing={3}>
              {ISSUE_TYPE_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value} size="lg">
                  {option.label}
                </Radio>
              ))}
            </Stack>
          </RadioGroup>
          <FormErrorMessage>{errors.issueType}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel fontWeight="semibold">Additional comments (optional)</FormLabel>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Provide any additional details about the issue..."
            rows={4}
          />
        </FormControl>

        <Box
          bg="yellow.50"
          p={4}
          borderRadius="md"
          borderLeft="4px solid"
          borderLeftColor="yellow.500"
        >
          <Text fontSize="sm" color="gray.700">
            <strong>Note:</strong> You can only submit one report per service every 2 minutes.
            We'll send you a follow-up email in about an hour to check if the issue persists.
          </Text>
        </Box>

        <Flex gap={3} justify="flex-end">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            isDisabled={submitReportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={submitReportMutation.isPending}
            loadingText="Submitting..."
          >
            Submit Report
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

export default function ReportPage() {
  return (
    <Flex flexDirection="column" minH="100vh" bg="base.canvas.default">
        <Flex flexDirection="column" flex={1} py={8}>
          <AppGrid>
            <Box gridColumn={{ base: '1 / -1', md: '3 / 11', lg: '4 / 10' }}>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="lg" mb={2}>
                    Report a Service Issue
                  </Heading>
                  <Text color="gray.600">
                    Let other officers know if you're experiencing issues with authentication
                    services.
                  </Text>
                </Box>

                <Card>
                  <CardBody>
                    <ReportForm />
                  </CardBody>
                </Card>
              </VStack>
            </Box>
          </AppGrid>
        </Flex>

        <AppGrid bg="base.canvas.default" px="1.5rem">
          <Box gridColumn={{ base: '1 / -1', md: '2 / 12' }}>
            <AppFooter containerProps={{ px: 0 }} />
          </Box>
        </AppGrid>
      </Flex>
  )
}
