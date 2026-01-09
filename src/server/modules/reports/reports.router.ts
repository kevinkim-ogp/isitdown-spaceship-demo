import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  CreateReportSchema,
  MeTooSchema,
  UpdateReportStatusSchema,
} from '~/schemas/report.schema'
import { protectedProcedure, publicProcedure, router } from '~/server/trpc'
import { users } from '../auth/users.store'
import {
  generateAuthenticatedMockData,
  generatePublicMockData,
} from './mockData'
import { sendFollowUpEmail } from './reports.service'

// In-memory store for mock report increments (persists during server session)
// Key: reportId (the grouped item's ID), Value: additional increments beyond base count
const mockReportIncrements = new Map<string, number>()

// In-memory store for agencies from "me too" clicks on mock reports
// Key: reportId (the grouped item's ID), Value: array of agencies from users who clicked "me too"
const mockReportAgencies = new Map<string, string[]>()

// In-memory store for most recent timestamp from "me too" clicks on mock reports
// Key: reportId (the grouped item's ID), Value: most recent timestamp from "me too" clicks
const mockReportMostRecentTimestamp = new Map<string, number>()

// In-memory store for user-submitted reports (replaces database)
const userSubmittedReports = new Map<string, any>()

// Helper to get grouping key for a report
function getGroupingKey(
  report: { service: string; detailedDescription?: string | null },
  isAuthenticated: boolean,
): string {
  return isAuthenticated && report.detailedDescription
    ? `${report.service}-${report.detailedDescription}`
    : report.service
}

export const reportsRouter = router({
  // Public endpoint to get dashboard data
  getDashboard: publicProcedure.query(async ({ ctx }) => {
    // Check authentication from session instead of client-provided flag
    const isAuthenticated = !!ctx.session?.userId

    // Use mock data for demonstration (same for both authenticated and unauthenticated)
    const mockReports = generateAuthenticatedMockData()

    // Get user-submitted reports from in-memory store
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    const activeUserReports = Array.from(userSubmittedReports.values()).filter(
      (report) => {
        if (report.status !== 'active' || report.createdAt === undefined) {
          return false
        }
        // Handle both number timestamps and ISO strings
        const reportTime =
          typeof report.createdAt === 'number'
            ? report.createdAt
            : new Date(report.createdAt).getTime()
        return reportTime >= twentyFourHoursAgo
      },
    )

    // Combine mock and user-submitted reports
    const combinedReports = [...mockReports, ...activeUserReports]

    // Group by service or by detailed description for authenticated users
    const issueStats: Record<
      string,
      {
        id?: string
        service: string
        issueType: string
        agencies?: string[]
        detailedDescription?: string
        totalReports: number
        issueBreakdown: Record<string, number>
        mostRecentReport: number
      }
    > = {}

    combinedReports.forEach((report) => {
      // Handle both number timestamps (mock/user reports) and ISO strings
      const reportTime =
        typeof report.createdAt === 'number'
          ? report.createdAt
          : new Date(report.createdAt).getTime()

      // Group by detailed description if it exists, otherwise by service
      // This ensures consistent data structure for both authenticated and unauthenticated users
      const key = report.detailedDescription
        ? `${report.service}-${report.detailedDescription}`
        : report.service

      if (!issueStats[key]) {
        // Get agencies from report (handle both mock and real reports)
        const reportAgencies: string[] = []
        if (
          'reporterAgencies' in report &&
          Array.isArray(report.reporterAgencies)
        ) {
          // Mock report with agencies array
          reportAgencies.push(...report.reporterAgencies)
        } else if ('reporterAgency' in report && report.reporterAgency) {
          // Real report with single agency
          reportAgencies.push(report.reporterAgency)
        }

        issueStats[key] = {
          id: report.id,
          service: report.service,
          issueType: report.issueType,
          agencies: reportAgencies.length > 0 ? reportAgencies : undefined,
          detailedDescription: report.detailedDescription || undefined,
          totalReports: 0,
          issueBreakdown: {},
          mostRecentReport: reportTime,
        }
      }

      const stats = issueStats[key]
      if (stats) {
        // Collect unique agencies from this report
        if (
          'reporterAgencies' in report &&
          Array.isArray(report.reporterAgencies)
        ) {
          // Mock report with agencies array
          const existingAgencies = new Set(stats.agencies || [])
          report.reporterAgencies.forEach((agency: string) =>
            existingAgencies.add(agency),
          )
          stats.agencies = Array.from(existingAgencies).sort()
        } else if ('reporterAgency' in report && report.reporterAgency) {
          // Real report with single agency
          const existingAgencies = new Set(stats.agencies || [])
          existingAgencies.add(report.reporterAgency)
          stats.agencies = Array.from(existingAgencies).sort()
        }

        // Add meTooCount if it exists, otherwise count as 1
        const reportCount = report.meTooCount || 1
        stats.totalReports += reportCount
        stats.issueBreakdown[report.issueType] =
          (stats.issueBreakdown[report.issueType] || 0) + reportCount

        if (reportTime > stats.mostRecentReport) {
          stats.mostRecentReport = reportTime
        }
      }
    })

    // Apply increments stored by grouped item IDs to the grouped stats
    // This handles the case where increments are stored by the grouped item's ID
    Object.values(issueStats).forEach((stats) => {
      if (stats.id && stats.id.startsWith('mock-')) {
        const increments = mockReportIncrements.get(stats.id) || 0
        if (increments > 0) {
          stats.totalReports += increments
          // Also add to the issue breakdown for the main issue type
          stats.issueBreakdown[stats.issueType] =
            (stats.issueBreakdown[stats.issueType] || 0) + increments
        }

        // Add agencies from "me too" clicks
        const meTooAgencies = mockReportAgencies.get(stats.id) || []
        if (meTooAgencies.length > 0) {
          const existingAgencies = new Set(stats.agencies || [])
          meTooAgencies.forEach((agency) => existingAgencies.add(agency))
          stats.agencies = Array.from(existingAgencies).sort()
        }

        // Update most recent timestamp from "me too" clicks if it's more recent
        const meTooTimestamp = mockReportMostRecentTimestamp.get(stats.id)
        if (meTooTimestamp && meTooTimestamp > stats.mostRecentReport) {
          stats.mostRecentReport = meTooTimestamp
        }
      }
    })

    // Convert to array and sort by total reports (descending)
    const sortedIssues = Object.values(issueStats).sort(
      (a, b) => b.totalReports - a.totalReports,
    )

    return sortedIssues
  }),

  // Public endpoint to submit a report (works for both authenticated and unauthenticated users)
  submitReport: publicProcedure
    .input(CreateReportSchema)
    .mutation(async ({ ctx, input }) => {
      const { service, issueType, comment } = input

      // Get user info if authenticated, otherwise use anonymous
      let email: string
      let name: string | undefined

      if (ctx.session?.userId) {
        const user = users.get(ctx.session.userId)
        email = user?.email || `anonymous-${Date.now()}@demo.gov.sg`
        name = user?.name
      } else {
        // Unauthenticated user - use anonymous identifier
        email = `anonymous-${Date.now()}@demo.gov.sg`
        name = undefined
      }

      // Check for duplicate reports within 2 minutes (using in-memory store)
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000
      const allUserReports = Array.from(userSubmittedReports.values())

      const recentDuplicate = allUserReports.find(
        (report) =>
          report.reporterEmail === email &&
          report.service === service &&
          report.status === 'active' &&
          report.createdAt !== undefined &&
          new Date(report.createdAt).getTime() >= twoMinutesAgo,
      )

      if (recentDuplicate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            "You've already reported this service recently. Please wait before submitting another report.",
        })
      }

      // Determine agency based on email domain
      let reporterAgency: string | undefined = undefined
      console.log('email', email)
      if (email.endsWith('@open.gov.sg')) {
        reporterAgency = 'OGP'
      } else {
        // Try to extract agency from email domain (e.g., user@msf.gov.sg -> MSF)
        const emailParts = email.split('@')
        const emailDomain = emailParts[1]
        if (emailDomain) {
          // Extract subdomain or domain prefix before .gov.sg
          const domainMatch = emailDomain.match(/^([^.]+)\.gov\.sg$/)
          if (domainMatch) {
            const domainPrefix = domainMatch[1]?.toUpperCase()
            // Map common domain prefixes to agency codes
            const domainToAgency: Record<string, string> = {
              MSF: 'MSF',
              PA: 'PA',
              NEA: 'NEA',
              MOH: 'MOH',
              MOE: 'MOE',
              MOM: 'MOM',
              MFA: 'MFA',
              MND: 'MND',
              MTI: 'MTI',
              MOF: 'MOF',
              MCI: 'MCI',
              MHA: 'MHA',
              PMO: 'PMO',
            }
            reporterAgency = domainToAgency[domainPrefix ?? ''] || domainPrefix
          }
        }
      }

      // Create the report in in-memory store
      const reportId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const now = Date.now()
      const report = {
        id: reportId,
        service,
        issueType,
        reporterEmail: email,
        reporterName: name || undefined,
        reporterAgency: reporterAgency || undefined,
        comment: comment || undefined,
        status: 'active' as const,
        followUpSent: false,
        followUpSentAt: undefined,
        meTooCount: 0,
        createdAt: now, // Use timestamp number to match mock data format
        updatedAt: now,
      }

      userSubmittedReports.set(reportId, report)

      // Save session to ensure the session cookie is preserved in the response
      if (ctx.session) {
        await ctx.session.save()
      }

      return report
    }),

  // Public endpoint for webhook to update report status
  updateReportStatus: publicProcedure
    .input(UpdateReportStatusSchema)
    .mutation(async ({ input }) => {
      const { reportId, status } = input

      const report = userSubmittedReports.get(reportId)

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found',
        })
      }

      report.status = status
      report.updatedAt = new Date().toISOString()
      userSubmittedReports.set(reportId, report)

      return { success: true }
    }),

  // Protected endpoint to check and send follow-up emails
  sendFollowUps: protectedProcedure.mutation(async () => {
    const allReports = Array.from(userSubmittedReports.values())
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    // Find reports that need follow-up
    const reportsNeedingFollowUp = allReports.filter(
      (report) =>
        report.status === 'active' &&
        !report.followUpSent &&
        report.createdAt !== undefined &&
        new Date(report.createdAt).getTime() <= oneHourAgo,
    )

    const results = []

    for (const report of reportsNeedingFollowUp) {
      try {
        await sendFollowUpEmail(report)
        report.followUpSent = true
        report.followUpSentAt = Date.now()
        report.updatedAt = new Date().toISOString()
        userSubmittedReports.set(report.id, report)
        results.push({ reportId: report.id, success: true })
      } catch (error) {
        results.push({
          reportId: report.id,
          success: false,
          error: String(error),
        })
      }
    }

    return { processed: results.length, results }
  }),

  // Protected endpoint to expire old reports
  expireOldReports: protectedProcedure.mutation(async () => {
    const allReports = Array.from(userSubmittedReports.values())
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000

    // Find reports older than 24 hours that are still active
    const reportsToExpire = allReports.filter(
      (report) =>
        report.status === 'active' &&
        report.createdAt !== undefined &&
        new Date(report.createdAt).getTime() <= twentyFourHoursAgo,
    )

    for (const report of reportsToExpire) {
      report.status = 'expired'
      report.updatedAt = new Date().toISOString()
      userSubmittedReports.set(report.id, report)
    }

    return { expired: reportsToExpire.length }
  }),

  // Public endpoint for "me too" functionality (works for both authenticated and unauthenticated users)
  reportMeToo: publicProcedure
    .input(MeTooSchema)
    .mutation(async ({ input, ctx }) => {
      const { reportId } = input

      // Get user email if authenticated, otherwise use anonymous
      let email: string
      if (ctx.session?.userId) {
        const user = users.get(ctx.session.userId)
        email = user?.email || `anonymous-${Date.now()}@demo.gov.sg`
      } else {
        // Unauthenticated user - use anonymous identifier
        email = `anonymous-${Date.now()}@demo.gov.sg`
      }

      // Handle mock reports - increment in-memory store
      if (reportId.startsWith('mock-')) {
        // Check if this mock report exists in either public or authenticated mock data
        const allMockReports = [
          ...generatePublicMockData(),
          ...generateAuthenticatedMockData(),
        ]
        const mockReport = allMockReports.find((r) => r.id === reportId)

        if (!mockReport) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Mock report not found',
          })
        }

        // Determine agency from user's email
        let userAgency: string | undefined = undefined
        if (email.endsWith('@open.gov.sg')) {
          userAgency = 'OGP'
        } else {
          const emailParts = email.split('@')
          if (emailParts.length >= 2) {
            const emailDomain = emailParts[1]
            if (emailDomain) {
              const domainMatch = emailDomain.match(/^([^.]+)\.gov\.sg$/)
              if (domainMatch && domainMatch[1]) {
                const domainPrefix = domainMatch[1]?.toUpperCase()
                const domainToAgency: Record<string, string> = {
                  MSF: 'MSF',
                  PA: 'PA',
                  NEA: 'NEA',
                  MOH: 'MOH',
                  MOE: 'MOE',
                  MOM: 'MOM',
                  MFA: 'MFA',
                  MND: 'MND',
                  MTI: 'MTI',
                  MOF: 'MOF',
                  MCI: 'MCI',
                  MHA: 'MHA',
                  PMO: 'PMO',
                }
                userAgency = domainToAgency[domainPrefix ?? ''] || domainPrefix
              }
            }
          }
        }

        // Increment the stored count for this mock report ID
        // Note: This ID is the grouped item's ID (first report in the group)
        const currentIncrements = mockReportIncrements.get(reportId) || 0
        const newIncrements = currentIncrements + 1
        mockReportIncrements.set(reportId, newIncrements)

        // Store the user's agency if available
        if (userAgency) {
          const existingAgencies = mockReportAgencies.get(reportId) || []
          if (!existingAgencies.includes(userAgency)) {
            existingAgencies.push(userAgency)
            mockReportAgencies.set(reportId, existingAgencies)
          }
        }

        // Store the current timestamp as the most recent "me too" click
        const currentTimestamp = Date.now()
        const existingTimestamp = mockReportMostRecentTimestamp.get(reportId)
        if (!existingTimestamp || currentTimestamp > existingTimestamp) {
          mockReportMostRecentTimestamp.set(reportId, currentTimestamp)
        }

        // Return success with the new total count (base + increments)
        const baseCount = mockReport.meTooCount || 0
        const newCount = baseCount + newIncrements

        // Save session to ensure the session cookie is preserved in the response
        if (ctx.session) {
          await ctx.session.save()
        }

        return { success: true, newCount }
      }

      // Check user-submitted reports
      const report = userSubmittedReports.get(reportId)

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found',
        })
      }

      if (report.status !== 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot add "me too" to inactive reports',
        })
      }

      // Increment the meTooCount
      const currentCount = report.meTooCount || 0
      report.meTooCount = currentCount + 1
      report.updatedAt = new Date().toISOString()
      userSubmittedReports.set(reportId, report)

      // Save session to ensure the session cookie is preserved in the response
      if (ctx.session) {
        await ctx.session.save()
      }

      return { success: true, newCount: currentCount + 1 }
    }),
})
