import { env } from '~/env.mjs'

/**
 * Parameters for sending transactional emails via Postman API.
 */
type SendMailParams = {
  /** Email address of the recipient */
  recipient: string
  /** HTML or plain text content of the email body */
  body: string
  /** Subject line of the email */
  subject: string
}

/**
 * Sends a transactional email using Postman API.
 *
 * If POSTMAN_API_KEY is not configured, logs the email parameters to console instead.
 *
 * @param params - Email parameters including recipient, subject, and body
 * @throws {Error} When the Postman API request fails
 */
export const sendMail = async (params: SendMailParams): Promise<void> => {
  if (env.POSTMAN_API_KEY) {
    const response = await fetch(
      'https://api.postman.gov.sg/v1/transactional/email/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.POSTMAN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      },
    )

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`,
      )
    }

    return
  }

  console.warn('POSTMAN_API_KEY missing. Logging the following mail: ', params)
  return
}
