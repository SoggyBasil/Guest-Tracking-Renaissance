import { NextRequest } from "next/server"

// Server-Sent Events endpoint for real-time service calls
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const debug = searchParams.get("debug") === "1"

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  })

  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔴 SSE connection established for service calls')
      
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Service calls live stream connected'
      })}\n\n`
      controller.enqueue(encoder.encode(initialMessage))

      // Poll for real-time logs and alarm data
      const pollAndStream = async () => {
        try {
          // Try to fetch real-time logs first
          let logData = null
          const logEndpoints = [
            'http://10.101.12.31/logs/realtime',
            'http://10.101.12.31/api/logs/live',
            'http://10.101.12.31/realtime/logs',
            'http://10.101.12.31/live/logs',
            'http://10.101.12.31/logs/current',
            'http://10.101.12.31/logs/tail',
            'http://10.101.12.31/tail',
            'http://10.101.12.31/stream/logs',
            'http://10.101.12.31/logs/application.log',
            'http://10.101.12.31/logs/system.log',
            'http://10.101.12.31/logs/C28StewCall.log',
            'http://10.101.12.31/log/current',
            'http://10.101.12.31/log/application.log',
            'http://10.101.12.31/var/log/application.log',
            'http://10.101.12.31/var/log/messages'
            // Removed test endpoint that was generating fake service calls
          ]

          // Try to get real-time logs
          for (const endpoint of logEndpoints) {
            try {
              // Handle relative URLs by making them absolute
              const fetchUrl = endpoint.startsWith('/') 
                ? `${req.url.split('/api/')[0]}${endpoint}`
                : endpoint
                
              const logResponse = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'text/plain, application/json, text/html',
                  'User-Agent': 'LiveTrackingDashboard/1.0'
                }
              })

              if (logResponse.ok) {
                logData = await logResponse.text()
                console.log(`✅ Found working log endpoint: ${endpoint}`)
                
                // Send the log data for parsing
                const logMessage = `data: ${JSON.stringify({
                  type: 'log_data',
                  timestamp: new Date().toISOString(),
                  data: logData,
                  source: endpoint
                })}\n\n`
                
                controller.enqueue(encoder.encode(logMessage))
                break
              }
            } catch (logError) {
              // Continue to next endpoint
              continue
            }
          }

          // Fallback to alarm XML if no log endpoint works
          if (!logData) {
            const response = await fetch('http://10.101.12.31/alarm.xml', {
              method: 'GET',
              headers: {
                'Accept': 'application/xml, text/xml, text/html',
                'User-Agent': 'LiveTrackingDashboard/1.0'
              }
            })

            if (response.ok) {
              const xmlData = await response.text()
              
              // Send the raw XML data for client-side parsing
              const dataMessage = `data: ${JSON.stringify({
                type: 'alarm_data',
                timestamp: new Date().toISOString(),
                data: xmlData
              })}\n\n`
              
              controller.enqueue(encoder.encode(dataMessage))
              
              if (debug) {
                console.log('📡 Streamed alarm data via SSE (fallback)')
              }
            } else {
              throw new Error(`Failed to fetch alarm data: ${response.status}`)
            }
          } else if (debug) {
            console.log('📡 Streamed log data via SSE')
          }
          
        } catch (error) {
          console.error('❌ Error in SSE polling:', error)
          const errorMessage = `data: ${JSON.stringify({
            type: 'error',
            timestamp: new Date().toISOString(),
            message: `Polling error: ${error instanceof Error ? error.message : 'Unknown error'}`
          })}\n\n`
          controller.enqueue(encoder.encode(errorMessage))
        }
      }

      // Initial poll
      pollAndStream()

      // Set up interval for aggressive polling (every 2 seconds for real-time)
      const pollInterval = setInterval(pollAndStream, 2000)

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        const heartbeat = `data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`
        controller.enqueue(encoder.encode(heartbeat))
      }, 10000) // Heartbeat every 10 seconds

      // Clean up on close
      req.signal?.addEventListener('abort', () => {
        console.log('🔴 SSE connection closed for service calls')
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        controller.close()
      })
    }
  })

  return new Response(stream, { headers })
}
