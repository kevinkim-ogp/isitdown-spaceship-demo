import { z } from 'zod'

export const ServiceEnum = z.enum(['plumber', 'singpass', 'corppass'])

export const IssueTypeEnum = z.enum([
  'cannot_login',
  'otp_not_received',
  'otp_delayed',
  'service_slow',
  'service_down',
  'other',
])

export const ReportStatusEnum = z.enum(['active', 'resolved', 'expired'])

export const CreateReportSchema = z.object({
  service: ServiceEnum,
  issueType: IssueTypeEnum,
  comment: z.string().optional(),
})

export const UpdateReportStatusSchema = z.object({
  reportId: z.string(),
  status: z.enum(['resolved', 'active']),
})

export const MeTooSchema = z.object({
  reportId: z.string(),
})

export type Service = z.infer<typeof ServiceEnum>
export type IssueType = z.infer<typeof IssueTypeEnum>
export type ReportStatus = z.infer<typeof ReportStatusEnum>
