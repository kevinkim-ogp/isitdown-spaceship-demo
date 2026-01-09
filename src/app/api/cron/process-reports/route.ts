import { NextResponse } from 'next/server'
import { ServiceReport } from '~/models'
import type { ServiceReportData } from '~/models'
import { sendFollowUpEmail } from '~/server/modules/reports/reports.service'

export async function GET() {
  try {
    const allReports = await ServiceReport.getAll()
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    let followUpsSent = 0
    let reportsExpired = 0

    // Process follow-up emails
    const reportsNeedingFollowUp = allReports.filter(
      (report) =>
        report.status === 'active' &&
        !report.followUpSent &&
        report.createdAt !== undefined &&
        new Date(report.createdAt).getTime() <= oneHourAgo,
    )

    for (const report of reportsNeedingFollowUp) {
      try {
        const typedReport = report as unknown as ServiceReportData
        await sendFollowUpEmail(typedReport)
        await (ServiceReport.update as any)(
          typedReport.id,
          undefined,
          {
            followUpSent: true,
            followUpSentAt: now,
          },
        )
        followUpsSent++
      } catch (error) {
        console.error(`Failed to send follow-up for report ${(report as any).id}:`, error)
      }
    }

    // Expire old reports
    const reportsToExpire = allReports.filter(
      (report) =>
        report.status === 'active' &&
        report.createdAt !== undefined &&
        new Date(report.createdAt).getTime() <= twentyFourHoursAgo,
    )

    for (const report of reportsToExpire) {
      try {
        const typedReport = report as unknown as ServiceReportData
        await (ServiceReport.update as any)(
          typedReport.id,
          undefined,
          {
            status: 'expired',
          },
        )
        reportsExpired++
      } catch (error) {
        console.error(`Failed to expire report ${(report as any).id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      followUpsSent,
      reportsExpired,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing reports:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process reports',
        details: String(error),
      },
      { status: 500 },
    )
  }
}
