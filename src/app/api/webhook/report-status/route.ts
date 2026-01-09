import { NextRequest, NextResponse } from 'next/server'
import { ServiceReport } from '~/models'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const reportId = searchParams.get('reportId')
  const status = searchParams.get('status')

  if (!reportId || !status) {
    return NextResponse.json(
      { error: 'Missing reportId or status' },
      { status: 400 },
    )
  }

  if (status !== 'active' && status !== 'resolved') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    const report = await (ServiceReport.get as any)(reportId)

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await (ServiceReport.update as any)(reportId, undefined, {
      status,
    })

    // Return a user-friendly HTML page
    const message =
      status === 'resolved'
        ? 'Thank you for confirming that the issue has been resolved!'
        : 'Thank you for confirming that you are still experiencing issues. We will continue to monitor the situation.'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Status Updated - Service Status Tracker</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              max-width: 500px;
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #2d3748;
              margin-bottom: 16px;
              font-size: 24px;
            }
            p {
              color: #4a5568;
              line-height: 1.6;
              margin-bottom: 24px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 500;
            }
            .button:hover {
              background-color: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${status === 'resolved' ? '✅' : '🔄'}</div>
            <h1>Status Updated</h1>
            <p>${message}</p>
            <a href="/" class="button">View Dashboard</a>
          </div>
        </body>
      </html>
    `

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error updating report status:', error)
    return NextResponse.json(
      { error: 'Failed to update report status' },
      { status: 500 },
    )
  }
}
