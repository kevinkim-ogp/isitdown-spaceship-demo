'use client'

import { Suspense as ReactSuspense, type ComponentProps } from 'react'

export const Suspense = (props: ComponentProps<typeof ReactSuspense>) => {
  return <ReactSuspense {...props} />
}
