// Mock data for demonstration purposes
// This generates realistic-looking issue reports for testing

export interface MockIssue {
  id: string
  service: string
  issueType: string
  reporterAgencies: string[]
  detailedDescription: string
  createdAt: number
  status: 'active'
  meTooCount: number
}

// Generate mock data for non-authenticated users (agency-level view)
export function generatePublicMockData(): MockIssue[] {
  const now = Date.now()

  return [
    // MSF - 5 reports in last 5 minutes
    {
      id: 'mock-msf-1',
      service: 'plumber',
      issueType: 'otp_not_received',
      reporterAgencies: ['MSF'],
      detailedDescription: 'General service issues',
      createdAt: now - 2 * 60 * 1000, // 2 minutes ago
      status: 'active',
      meTooCount: 5,
    },
    // PA - 3 reports in last 30 minutes
    {
      id: 'mock-pa-1',
      service: 'singpass',
      issueType: 'service_slow',
      reporterAgencies: ['PA'],
      detailedDescription: 'General service issues',
      createdAt: now - 15 * 60 * 1000, // 15 minutes ago
      status: 'active',
      meTooCount: 3,
    },
    // NEA - 10 reports in last hour
    {
      id: 'mock-nea-1',
      service: 'corppass',
      issueType: 'cannot_login',
      reporterAgencies: ['NEA'],
      detailedDescription: 'General service issues',
      createdAt: now - 45 * 60 * 1000, // 45 minutes ago
      status: 'active',
      meTooCount: 10,
    },
  ]
}

// Generate mock data for authenticated users (detailed view)
export function generateAuthenticatedMockData(): MockIssue[] {
  const now = Date.now()

  return [
    // MSF - OTP issues with Plumber (last 5 min)
    {
      id: 'mock-auth-msf-1',
      service: 'plumber',
      issueType: 'otp_not_received',
      reporterAgencies: ['MSF'],
      detailedDescription: 'Not receiving OTP from Plumber',
      createdAt: now - 2 * 60 * 1000, // 2 minutes ago
      status: 'active',
      meTooCount: 5,
    },
    // PA - Workday leave request issues (last 30 min)
    {
      id: 'mock-auth-pa-1',
      service: 'singpass',
      issueType: 'service_slow',
      reporterAgencies: ['PA'],
      detailedDescription: 'Unable to submit leave requests on Workday',
      createdAt: now - 15 * 60 * 1000, // 15 minutes ago
      status: 'active',
      meTooCount: 3,
    },
    // NEA - data.gov.sg upload issues (last hour)
    {
      id: 'mock-auth-nea-1',
      service: 'corppass',
      issueType: 'cannot_login',
      reporterAgencies: ['NEA'],
      detailedDescription: 'Issues with uploading datasets to data.gov.sg',
      createdAt: now - 45 * 60 * 1000, // 45 minutes ago
      status: 'active',
      meTooCount: 10,
    },
  ]
}
