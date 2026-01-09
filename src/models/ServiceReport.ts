import {
  createModel,
  ExtractType,
  fieldMixins,
  optional,
  primaryKey,
} from '~/lib/dynamodb'

const ServiceReportSchema = {
  id: primaryKey(),
  service: { type: String, required: true }, // 'plumber', 'singpass', 'corppass'
  issueType: { type: String, required: true }, // 'cannot_login', 'otp_not_received', 'otp_delayed', 'service_slow', 'service_down', 'other'
  reporterEmail: { type: String, required: true },
  reporterName: optional(String, null),
  reporterAgency: optional(String, null), // Agency of the reporter (e.g., 'MSF', 'PA', 'NEA')
  comment: optional(String, null),
  detailedDescription: optional(String, null), // Detailed description of the issue (e.g., 'Unable to submit leave requests on Workday')
  status: { type: String, required: true }, // 'active', 'resolved', 'expired'
  followUpSent: { type: Boolean, required: true }, // Whether 1-hour follow-up email has been sent
  followUpSentAt: optional(Number, null), // Timestamp when follow-up was sent
  meTooCount: optional(Number, 0), // Number of users who also reported this issue
  ...fieldMixins.timestamps(),
}

const ServiceReport = createModel(ServiceReportSchema, 'ServiceReport')

export default ServiceReport

export type ServiceReportData = ExtractType<typeof ServiceReportSchema>
