import {
  createModel,
  ExtractType,
  fieldMixins,
  optional,
  primaryKey,
} from '~/lib/dynamodb'

const UserSchema = {
  email: primaryKey(),
  name: optional(String, null),
  image: optional(String, null),
  ...fieldMixins.timestamps(),
}

const User = createModel(UserSchema, 'User')

export default User

export type UserData = ExtractType<typeof UserSchema>
