import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const DEFAULT_AWS_DDB_REGION = 'ap-southeast-1'

export const getDynamoDBClient = () => {
  if (process.env.LOCAL_DB === 'true') {
    return new DynamoDBClient({
      endpoint: 'http://localhost:8000',
      region: 'local',
      credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      },
    })
  }

  if (
    !!process.env.DDB_AWS_ACCESS_KEY_ID &&
    !!process.env.DDB_AWS_SECRET_ACCESS_KEY
  ) {
    return new DynamoDBClient({
      credentials: {
        accessKeyId: process.env.DDB_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.DDB_AWS_SECRET_ACCESS_KEY,
      },
      region: process.env.DDB_AWS_REGION ?? DEFAULT_AWS_DDB_REGION,
    })
  }

  return new DynamoDBClient({
    region: process.env.DDB_AWS_REGION ?? DEFAULT_AWS_DDB_REGION,
  })
}

export const getDynamoDBDocumentClient = () =>
  DynamoDBDocumentClient.from(getDynamoDBClient())
