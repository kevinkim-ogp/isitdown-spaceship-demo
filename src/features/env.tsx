import { useContext } from 'react'

import {
  EnvContext,
  type EnvContextReturn,
} from '~/components/AppLayout/AppProviders'

export const useEnv = (): EnvContextReturn => {
  const context = useContext(EnvContext)
  if (context === undefined) {
    throw new Error('useEnv must be used within a EnvProvider')
  }
  return context
}
