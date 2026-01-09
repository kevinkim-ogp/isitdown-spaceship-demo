'use client'

import '@fontsource/ibm-plex-mono' // Import if using code textStyles.
import 'inter-ui/inter.css' // Strongly recommended if using OGP design system, as design uses this font.

import { Badge, Box, Skeleton, Stack } from '@chakra-ui/react'
import { ThemeProvider } from '@opengovsg/design-system-react'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from 'react-error-boundary'

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { env } from '~/env.mjs'
import { AuthProvider } from '~/features/auth'
import { theme } from '~/theme'
import { EnvProvider, TrpcProvider } from './AppProviders'
import { DefaultFallback } from './ErrorBoundary'
import { Suspense } from './Suspense'
import { VersionWrapper } from './VersionWrapper'

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main>
      <EnvProvider env={env}>
        <TrpcProvider>
          <AuthProvider>
            <ThemeProvider theme={theme}>
              <ErrorBoundary FallbackComponent={DefaultFallback}>
                <Suspense fallback={<Skeleton width="100vw" height="100vh" />}>
                  <Stack spacing={0} minH="$100vh">
                    {/* Beta Testing Banner */}
                    <Box
                      bg="orange.400"
                      color="white"
                      py={4}
                      px={4}
                      textAlign="center"
                      position="sticky"
                      top={0}
                      zIndex={1000}
                      boxShadow="lg"
                      borderBottom="4px solid"
                      borderColor="orange.600"
                    >
                      <Stack spacing={1} align="center">
                        <Box>
                          <Badge
                            colorScheme="red"
                            fontSize="xl"
                            px={4}
                            py={2}
                            borderRadius="md"
                            fontWeight="black"
                            textTransform="uppercase"
                          >
                            ⚠️ BETA TESTING VERSION ⚠️
                          </Badge>
                        </Box>
                        <Box fontSize="md" fontWeight="semibold">
                          This is a test environment - All reports are for testing purposes only and are not real
                        </Box>
                      </Stack>
                    </Box>
                    <VersionWrapper />
                    {children}
                    {['test', 'development'].includes(process.env.NODE_ENV) && (
                      <ReactQueryDevtools initialIsOpen={false} />
                    )}
                  </Stack>
                </Suspense>
              </ErrorBoundary>
            </ThemeProvider>
          </AuthProvider>
        </TrpcProvider>
      </EnvProvider>
    </main>
  )
}
