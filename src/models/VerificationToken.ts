import {
  createModel,
  ExtractType,
  optional,
  primaryKey,
  required,
} from '~/lib/dynamodb'
import { fieldMixins, timestamp } from '~/lib/dynamodb/schemaHelpers'

const VerificationTokenSchema = {
  email: primaryKey(),
  token: required(String),
  attempts: optional(Number, 0),
  expires: timestamp(),
  ...fieldMixins.timestamps(),
}

const VerificationToken = createModel(
  VerificationTokenSchema,
  'VerificationToken',
)

export default VerificationToken

export type VerificationTokenData = ExtractType<typeof VerificationTokenSchema>
