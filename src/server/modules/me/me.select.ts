import { UserData } from '~/models'

/**
 * Default type for User data returned from Amplify
 */
export type DefaultMeSelect = {
  email: string
  image?: string | null
  name?: string | null
}

// Helper function to transform DynamoDB User to our select type
export const transformUserToMeSelect = (
  user: UserData | null,
): DefaultMeSelect | null => {
  if (!user) return null

  return {
    email: user.email as string,
    image: user.image as string | null | undefined,
    name: user.name as string | null | undefined,
  }
}
