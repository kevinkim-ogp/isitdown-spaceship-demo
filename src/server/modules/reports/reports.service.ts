import type { ServiceReportData } from '~/models'
import { sendMail } from '~/lib/mail'
import { env } from '~/env.mjs'

const SERVICE_NAMES: Record<string, string> = {
  plumber: 'Plumber (OTP Login)',
  singpass: 'SingPass Login',
  corppass: 'CorpPass Login',
}

const ISSUE_TYPE_NAMES: Record<string, string> = {
  cannot_login: 'Cannot log in',
  otp_not_received: 'OTP not received',
  otp_delayed: 'OTP delayed',
  service_slow: 'Service slow',
  service_down: 'Service down',
  other: 'Other',
}

export async function sendFollowUpEmail(report: ServiceReportData) {
  const serviceName = SERVICE_NAMES[report.service] || report.service
  const issueTypeName =
    ISSUE_TYPE_NAMES[report.issueType] || report.issueType

  const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const basePath = env.NEXT_PUBLIC_BASE_PATH || ''
  const fullBaseUrl = `${baseUrl}${basePath}`

  const stillHavingIssuesUrl = `${fullBaseUrl}/api/webhook/report-status?reportId=${report.id}&status=active`
  const resolvedUrl = `${fullBaseUrl}/api/webhook/report-status?reportId=${report.id}&status=resolved`

  const emailBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Service Status Follow-up</h2>
        <p>Hello${report.reporterName ? ` ${report.reporterName}` : ''},</p>
        
        <p>You reported an issue with <strong>${serviceName}</strong> about an hour ago:</p>
        <ul>
          <li><strong>Issue type:</strong> ${issueTypeName}</li>
          ${report.comment ? `<li><strong>Your comment:</strong> ${report.comment}</li>` : ''}
        </ul>
        
        <p>We'd like to check if you're still experiencing this issue.</p>
        
        <p style="margin: 30px 0;">
          <a href="${stillHavingIssuesUrl}" 
             style="display: inline-block; padding: 12px 24px; margin-right: 10px; background-color: #e53e3e; color: white; text-decoration: none; border-radius: 5px;">
            Still Having Issues
          </a>
          
          <a href="${resolvedUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #38a169; color: white; text-decoration: none; border-radius: 5px;">
            Issue Resolved
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          If you don't respond, your report will automatically expire after 24 hours from when you first reported it.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="color: #666; font-size: 12px;">
          This is an automated message from the Service Status Tracker.<br>
          Report ID: ${report.id}
        </p>
      </body>
    </html>
  `

  await sendMail({
    recipient: report.reporterEmail,
    subject: `Follow-up: ${serviceName} Issue Status`,
    body: emailBody,
  })
}
