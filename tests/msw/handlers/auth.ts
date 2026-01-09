import { trpcMsw } from '~tests/msw/mockTrpc'

import { VfnStepData } from '~/app/sign-in/SignInContext'

const loginPostQuery = (vfnStepData: VfnStepData) => {
  return trpcMsw.auth.login.mutation(() => {
    return vfnStepData
  })
}

export const authHandlers = {
  login: loginPostQuery,
}
