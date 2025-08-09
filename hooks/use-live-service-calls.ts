"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type TraceITServiceItem } from "@/lib/traceit"
import { useToast } from "@/hooks/use-toast"
import { convertCustomDateToISO } from "@/lib/utils"

export interface ServiceCallAlert {
  wristbandId: string
  status: 'sentToRadios' | 'accepted' | 'expired'
  callId: string
  text: string
  timestamp: string
  ackBy?: string
  ackTime?: string
  flashState: 'red' | 'green' | 'none'
  flashStartTime?: number
}

// Log parsing functions for C28StewCallInterface messages and ACCEPT acknowledgments
function parseC28StewCallLogs(logData: string, existingCalls: TraceITServiceItem[] = []): { newCalls: TraceITServiceItem[], acknowledgments: { alarmId: string, ackBy: string, ackTime: string }[] } {
  const lines = logData.split('\n')
  const stewCalls = new Map<string, TraceITServiceItem>() // Use map to deduplicate
  const acknowledgments: { alarmId: string, ackBy: string, ackTime: string }[] = []
  
  console.log(`🔍 Parsing log data - ${lines.length} lines to check`)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Parse ACCEPT acknowledgments first
    // Pattern: "ACCEPTProcessTmpTextfromRadio(00735, Private, ACCEPT)" followed by "ProcessAlarmAcknowledge(31211, 735, Interior 7)"
    const acceptMatch = line.match(/ACCEPTProcessTmpTextfromRadio\((\d+),\s*\w+,\s*ACCEPT\)/i)
    if (acceptMatch) {
      const radioId = acceptMatch[1]
      console.log(`🟢 Found ACCEPT from RadioId: ${radioId}`)
      
      // Look for the corresponding ProcessAlarmAcknowledge in the next few lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const ackLine = lines[j].trim()
        const ackMatch = ackLine.match(/ProcessAlarmAcknowledge\((\d+),\s*(\d+),\s*(.+?)\)/i)
        if (ackMatch) {
          const alarmId = ackMatch[1]
          const ackByRadioId = ackMatch[2]
          const location = ackMatch[3].trim()
          
          // Extract timestamp from the current line if available
          const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[^\s]*)/i) ||
                                line.match(/^(\d{2}:\d{2}:\d{2}[^\s]*)/i) ||
                                line.match(/^(\[\d{2}:\d{2}:\d{2}\])/i)
          
          const ackTime = timestampMatch ? timestampMatch[1] : new Date().toISOString()
          
          acknowledgments.push({
            alarmId,
            ackBy: ackByRadioId,
            ackTime
          })
          
          console.log(`✅ Found alarm acknowledgment: Alarm ${alarmId} acknowledged by ${ackByRadioId} at ${ackTime} in ${location}`)
          break
        }
      }
    }
    
    // Look for C28StewCallInterface messages on ports 28007, 28008, 28009
    const stewCallMatch = line.match(/C28StewCallInterface\s+Port\s+(2800[789])\s+Notify\s+of\s+other\s+STE:\s*\(?(.+?)\)?$/i)
    
    if (stewCallMatch) {
      const port = stewCallMatch[1]
      const message = stewCallMatch[2].trim()
      
      console.log(`🔍 Found C28StewCallInterface on port ${port}: ${message}`)
      
      // Extract wristband and location from message
      // Pattern variations:
      // "G2 505 Renaissance on AV ROOM 232" - Guest with cabin number
      // "P1 Renaissance on OWNER SUITE" - Family/VIP without cabin number
      // "C1 Renaissance on MAIN DECK BAR" - Child without cabin number
      
      let wristbandId = ''
      let location = ''
      let vesselName = ''
      
      // Try pattern with cabin number first: G2 505 Renaissance on LOCATION
      let messageMatch = message.match(/^(G\d+)\s+(\d+)\s+(\w+)\s+on\s+(.+)$/i)
      
      if (messageMatch) {
        const wristbandPrefix = messageMatch[1].trim() // "G2"
        const wristbandNumber = messageMatch[2].trim() // "505"
        vesselName = messageMatch[3].trim() // "Renaissance"
        location = messageMatch[4].trim() // "AV ROOM 232"
        
        // Create wristband ID (e.g., "G2 505")
        wristbandId = `${wristbandPrefix} ${wristbandNumber}`
      } else {
        // Try pattern without cabin number: P1 Renaissance on LOCATION
        messageMatch = message.match(/^([PC]\d+)\s+(\w+)\s+on\s+(.+)$/i)
        
        if (messageMatch) {
          wristbandId = messageMatch[1].trim() // "P1" or "C1"
          vesselName = messageMatch[2].trim() // "Renaissance"
          location = messageMatch[3].trim() // "OWNER SUITE"
        }
      }
      
      if (wristbandId && location) {
        
        // Use the wristband + message as key to deduplicate across ports
        const callKey = `${wristbandId}-${location}`
        
        if (!stewCalls.has(callKey)) {
          // Extract timestamp from log line if available
          const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[^\s]*)/i) ||
                                line.match(/^(\d{2}:\d{2}:\d{2}[^\s]*)/i) ||
                                line.match(/^(\[\d{2}:\d{2}:\d{2}\])/i)
          
          const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()
          
          // Create unique ID based on timestamp and wristband to avoid duplicates
          const uniqueId = Date.now() + Math.random() * 1000
          
          stewCalls.set(callKey, {
            id: Math.floor(uniqueId),
            text: `Service call from ${wristbandId} in ${location}`,
            wristbands: [wristbandId],
            status: 'sentToRadios',
            timestamp: timestamp,
            ackBy: undefined,
            ackTime: undefined
          })
          
          console.log(`✅ Added deduplicated service call: ${wristbandId} in ${location}`)
        } else {
          console.log(`🔄 Duplicate service call detected (same call on multiple ports): ${wristbandId} in ${location}`)
        }
      }
    }
  }
  
  return {
    newCalls: Array.from(stewCalls.values()),
    acknowledgments
  }
}

// XML parsing functions (simplified from the API route)
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractWristbandIds(text: string): string[] {
  const matches = new Set<string>()
  const patterns: RegExp[] = [
    /\bG[12][- ]?\d{3}\b/gi, // G1-407 or G1 407
    /\bG\d{3}\b/gi,         // G414 (cabin-level without guest index)
    /\bP\d\b/gi,             // P1..P9
    /\bC\d\b/gi,             // C1..C9
  ]
  for (const re of patterns) {
    const found = text.match(re)
    if (found) {
      found.forEach((m) => matches.add(m.replace(/\s+/g, " ")))
    }
  }
  return Array.from(matches)
}

function parseXmlAlarms(xml: string): TraceITServiceItem[] {
  // Extract <alarm .../> self-closing and <alarm>...</alarm> blocks
  const selfClosing = xml.match(/<\s*alarm\b[^>]*\/>/gi) || []
  const blocks = xml.match(/<\s*alarm\b[\s\S]*?<\s*\/\s*alarm\s*>/gi) || []

  const readTag = (block: string, tag: string): string | null => {
    const re = new RegExp(`<\\s*${tag}[^>]*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`, 'i')
    const m = block.match(re)
    return m?.[1]?.trim() || null
  }

  const readAttr = (block: string, attr: string): string | null => {
    const re = new RegExp(`${attr}\\s*=\\s*"([^"]+)"`, 'i')
    const m = block.match(re)
    return m?.[1]?.trim() || null
  }

  const parseBlock = (block: string, idx: number): TraceITServiceItem => {
    // Extract text/message
    const textCandidates = [
      readTag(block, 'text'),
      readTag(block, 'Text'),
      readTag(block, 'message'),
      readTag(block, 'Message'),
      readTag(block, 'description'),
      readTag(block, 'Description'),
      readTag(block, 'AlarmText'),
      readAttr(block, 'text'),
      readAttr(block, 'message'),
    ]
    let text = (textCandidates.find(Boolean) || '').toString().trim()
    if (!text) {
      text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    // Extract status information
    const statusCandidates = [
      readTag(block, 'status'),
      readTag(block, 'Status'),
      readTag(block, 'STATE'),
      readTag(block, 'state'),
      readAttr(block, 'status'),
      readAttr(block, 'Status'),
      readAttr(block, 'state'),
      readAttr(block, 'STATE'),
    ]
    const status = (statusCandidates.find(Boolean) || '').toString().trim().toLowerCase()

    // Extract acknowledgment information
    const ackByCandidates = [
      readTag(block, 'ackby'),
      readTag(block, 'AckBy'),
      readTag(block, 'acknowledgedby'),
      readTag(block, 'AcknowledgedBy'),
      readAttr(block, 'ackby'),
      readAttr(block, 'AckBy'),
    ]
    const ackBy = (ackByCandidates.find(Boolean) || '').toString().trim()

    // Extract acknowledgment time
    const ackTimeCandidates = [
      readTag(block, 'acktime'),
      readTag(block, 'AckTime'),
      readTag(block, 'acknowledgedtime'),
      readTag(block, 'AcknowledgedTime'),
      readAttr(block, 'acktime'),
      readAttr(block, 'AckTime'),
    ]
    const ackTime = (ackTimeCandidates.find(Boolean) || '').toString().trim()

    // Extract timestamp
    const timestampCandidates = [
      readTag(block, 'timestamp'),
      readTag(block, 'Timestamp'),
      readTag(block, 'time'),
      readTag(block, 'Time'),
      readAttr(block, 'timestamp'),
      readAttr(block, 'Timestamp'),
      readAttr(block, 'time'),
      readAttr(block, 'Time'),
    ]
    const timestamp = (timestampCandidates.find(Boolean) || '').toString().trim()

    const wristbands = extractWristbandIds(text)
    return { 
      id: idx, 
      text, 
      wristbands,
      status,
      ackBy: ackBy || undefined,
      ackTime: ackTime || undefined,
      timestamp: timestamp || undefined
    }
  }

  const itemsBlocks = blocks.map((block, idx) => parseBlock(block, idx))
  const offset = itemsBlocks.length
  const itemsSelf = selfClosing.map((block, i) => parseBlock(block, offset + i))
  const items = [...itemsBlocks, ...itemsSelf]

  // Keep only alarms of type 'ste' (service calls)
  return items.filter((it) => 
    it.text.toLowerCase().includes('service') || 
    it.text.toLowerCase().includes('housekeeping') ||
    it.text.toLowerCase().includes('maintenance') ||
    it.wristbands.length > 0
  )
}

export function useLiveServiceCalls() {
  const [serviceCalls, setServiceCalls] = useState<TraceITServiceItem[]>([])
  const [alerts, setAlerts] = useState<Map<string, ServiceCallAlert>>(new Map())
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastDataHash, setLastDataHash] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  
  // Use refs to track state
  const eventSourceRef = useRef<EventSource | null>(null)
  const callStatusMapRef = useRef<Map<number, { status: string, ackBy?: string, ackTime?: string }>>(new Map())

  // Create a simple hash of the data to detect changes
  const createDataHash = (calls: TraceITServiceItem[]): string => {
    return calls.map(call => `${call.id}-${call.text}-${call.wristbands.join(',')}-${call.status || ''}-${call.ackBy || ''}-${call.ackTime || ''}`).join('|')
  }

  const processLogData = useCallback((logData: string) => {
    const now = Date.now()
    
    try {
      // Parse C28StewCallInterface messages and acknowledgments from logs
      const { newCalls, acknowledgments } = parseC28StewCallLogs(logData, serviceCalls)
      
      console.log(`📡 Parsed ${newCalls.length} service calls and ${acknowledgments.length} acknowledgments from log data`)
      
      // Check if we have new calls
      const existingCallIds = new Set(serviceCalls.map(call => call.id))
      const newCallsList = newCalls.filter(call => !existingCallIds.has(call.id))
      const hasNewCalls = newCallsList.length > 0
      
      // Show notification only for truly new calls (not for acknowledgments)
      if (hasNewCalls && serviceCalls.length > 0) {
        // Only show notification for new calls, limit to most recent ones
        const recentNewCalls = newCallsList.slice(-2) // Last 2 new calls only to prevent spam
        const newCallCount = recentNewCalls.length
        const newCallTexts = recentNewCalls.map(call => {
          // Extract just the wristband ID for cleaner notification
          const wristbandMatch = call.text.match(/Service call from (.+?) in/)
          return wristbandMatch ? wristbandMatch[1] : call.text
        }).join(', ')
        
        console.log(`🚨 Showing notification for ${newCallCount} new service calls:`, {
          recentNewCalls: recentNewCalls.map(call => ({ id: call.id, text: call.text, wristbands: call.wristbands })),
          totalNewCalls: newCallsList.length
        })
        
        toast({
          title: "🚨 New Service Call",
          description: `${newCallTexts}`,
          variant: "destructive",
        })
      }
      
      // Process acknowledgments to update existing calls
      const updatedCalls = [...serviceCalls]
      const currentAlerts = new Map(alerts)
      let hasAcknowledgments = false
      
      acknowledgments.forEach(ack => {
        // Find the call to update based on alarm ID
        // For now, we'll match by timestamp proximity or wristband until we have better mapping
        console.log(`🟢 Processing acknowledgment for alarm ${ack.alarmId} by ${ack.ackBy}`)
        
        // Update alerts for this acknowledgment
        currentAlerts.forEach((alert, alertKey) => {
          if (alert.status === 'sentToRadios') {
            // Mark as accepted and start green flash
            currentAlerts.set(alertKey, {
              ...alert,
              status: 'accepted',
              ackBy: ack.ackBy,
              ackTime: ack.ackTime,
              flashState: 'green',
              flashStartTime: now
            })
            hasAcknowledgments = true
            console.log(`🟢 Updated alert ${alertKey} to accepted status`)
          }
        })
      })
      
      // Create hash of combined data
      const newDataHash = createDataHash([...updatedCalls, ...newCalls])
      
      // Process if data has changed or we have new calls or acknowledgments
      if (newDataHash !== lastDataHash || hasNewCalls || hasAcknowledgments) {
        console.log('🔄 Live log data changed, processing updates...')
        
        // Merge existing and new calls
        const allCalls = [...updatedCalls]
        newCalls.forEach(newCall => {
          if (!existingCallIds.has(newCall.id)) {
            allCalls.push(newCall)
          }
        })
        
        // Process new calls and update alerts
        const newAlerts = new Map(currentAlerts)
        
        // Add alerts for new calls
        newCalls.forEach((call) => {
          if (!existingCallIds.has(call.id)) {
            call.wristbands.forEach(wristbandId => {
              const alertKey = `${wristbandId}-${call.id}`
              
              // New alert - flash red for new service calls
              newAlerts.set(alertKey, {
                wristbandId,
                status: 'sentToRadios',
                callId: call.id.toString(),
                text: call.text,
                timestamp: call.timestamp || new Date(now).toISOString(),
                ackBy: undefined,
                ackTime: undefined,
                flashState: 'red',
                flashStartTime: now
              })
              
              console.log(`🔴 New service call detected for ${wristbandId} - call ${call.id}`)
            })
          }
        })
        
        // Sort by ID descending (newest first)
        const sortedCalls = allCalls.sort((a, b) => b.id - a.id)
        
        setServiceCalls(sortedCalls)
        setAlerts(newAlerts)
        setLastDataHash(newDataHash)
        setLastUpdate(new Date())
      } else if (newCalls.length === 0 && acknowledgments.length === 0) {
        console.log('📊 No new service calls or acknowledgments found in log data')
      }
    } catch (error) {
      console.error('❌ Error processing live log data:', error)
    }
  }, [alerts, serviceCalls, lastDataHash, toast])

  const processServiceCallData = useCallback((xmlData: string) => {
    const now = Date.now()
    
    try {
      const newCalls = parseXmlAlarms(xmlData)
      console.log('🔍 XML Service calls found:', newCalls.map(call => ({ id: call.id, text: call.text, wristbands: call.wristbands })))
      
      // Create hash of new data
      const newDataHash = createDataHash(newCalls)
      
      // Check if we have new calls
      const existingCallIds = new Set(serviceCalls.map(call => call.id))
      const newCallsList = newCalls.filter(call => !existingCallIds.has(call.id))
      const hasNewCalls = newCallsList.length > 0
      
      // Show notification only for truly new calls - limit to prevent spam
      if (hasNewCalls && serviceCalls.length > 0) {
        const recentNewCalls = newCallsList.slice(-2) // Last 2 new calls only
        const newCallCount = recentNewCalls.length
        const newCallTexts = recentNewCalls.map(call => {
          // Extract just the wristband ID for cleaner notification
          const wristbandMatch = call.text.match(/Service call from (.+?) in/)
          return wristbandMatch ? wristbandMatch[1] : call.text.substring(0, 50) + (call.text.length > 50 ? '...' : '')
        }).join(', ')
        
        console.log(`🚨 Showing notification for ${newCallCount} new service calls (XML):`, {
          recentNewCalls: recentNewCalls.map(call => ({ id: call.id, text: call.text, wristbands: call.wristbands })),
          totalNewCalls: newCallsList.length
        })
        
        toast({
          title: "🚨 New Service Call",
          description: `${newCallTexts}`,
          variant: "destructive",
        })
      }
      
      // Process if data has changed or we have new calls
      if (newDataHash !== lastDataHash || hasNewCalls) {
        console.log('🔄 Live service calls data changed, processing updates...')
        
        // Process new calls and update alerts
        const newAlerts = new Map<string, ServiceCallAlert>()
        
        // Sort by ID descending (newest first)
        const recentCalls = newCalls.sort((a, b) => b.id - a.id)
        
        recentCalls.forEach((call) => {
          // Check existing status
          const existingStatus = callStatusMapRef.current.get(call.id)
          
          let status: 'sentToRadios' | 'accepted' | 'expired' = 'sentToRadios'
          let ackBy: string | undefined
          let ackTime: string | undefined
          
          if (existingStatus) {
            status = existingStatus.status as 'sentToRadios' | 'accepted' | 'expired'
            ackBy = existingStatus.ackBy
            ackTime = existingStatus.ackTime
          } else {
            // Use actual status from API if available
            if (call.status) {
              const apiStatus = call.status.toLowerCase()
              if (apiStatus === 'expired' || apiStatus === 'accepted' || apiStatus === 'acknowledged') {
                status = 'accepted'
              } else if (apiStatus === 'sent' || apiStatus === 'active' || apiStatus === 'pending') {
                status = 'sentToRadios'
              }
              
              if (call.ackBy) {
                ackBy = call.ackBy
              }
              if (call.ackTime) {
                ackTime = call.ackTime
              }
            }
            
            // Store the status
            callStatusMapRef.current.set(call.id, { status, ackBy, ackTime })
          }
          
          // Create alerts for each wristband
          call.wristbands.forEach(wristbandId => {
            const alertKey = `${wristbandId}-${call.id}`
            const existingAlert = alerts.get(alertKey)
            
            let flashState: 'red' | 'green' | 'none' = 'none'
            let flashStartTime: number | undefined
            
            if (existingAlert) {
              // Check for status changes
              if (existingAlert.status === 'sentToRadios' && (status === 'accepted' || status === 'expired')) {
                flashState = 'green'
                flashStartTime = now
                console.log(`🟢 New acceptance detected for ${wristbandId} - call ${call.id}`)
              } else if (existingAlert.flashState === 'green') {
                const flashAge = now - (existingAlert.flashStartTime || 0)
                if (flashAge < 10000) {
                  flashState = 'green'
                  flashStartTime = existingAlert.flashStartTime
                }
              } else if (existingAlert.flashState === 'red') {
                if (status === 'sentToRadios') {
                  flashState = 'red'
                  flashStartTime = existingAlert.flashStartTime
                }
              }
            } else {
              // New alert - flash if sentToRadios
              if (status === 'sentToRadios') {
                flashState = 'red'
                flashStartTime = now
                console.log(`🔴 New service call detected for ${wristbandId} - call ${call.id}`)
              }
            }
            
            newAlerts.set(alertKey, {
              wristbandId,
              status,
              callId: call.id.toString(),
              text: call.text,
              timestamp: (call.timestamp ? convertCustomDateToISO(call.timestamp) : null) || call.timestamp || new Date(now).toISOString(),
              ackBy,
              ackTime,
              flashState,
              flashStartTime
            })
          })
        })
        
        setServiceCalls(recentCalls)
        setAlerts(newAlerts)
        setLastDataHash(newDataHash)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('❌ Error processing live service call data:', error)
    }
  }, [alerts, serviceCalls, lastDataHash, toast])

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log('🔄 Connecting to live service calls SSE...')
    const eventSource = new EventSource('/api/service-calls/live')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened for service calls')
      setIsConnected(true)
      setLoading(false)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            console.log('🔗 SSE service calls stream connected')
            break
          case 'log_data':
            console.log('📡 Received live log data via SSE from:', data.source)
            processLogData(data.data)
            break
          case 'alarm_data':
            console.log('📡 Received live alarm data via SSE (fallback)')
            console.log('⚠️ WARNING: Using XML fallback - this may contain old service calls')
            processServiceCallData(data.data)
            break
          case 'heartbeat':
            // Connection is alive
            break
          case 'error':
            console.error('❌ SSE error:', data.message)
            break
        }
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error)
      setIsConnected(false)
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect SSE...')
        connectSSE()
      }, 5000)
    }
  }, [processServiceCallData])

  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
      console.log('⏹️ SSE connection closed for service calls')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    connectSSE()

    return () => {
      disconnectSSE()
    }
  }, [connectSSE, disconnectSSE])

  // Clean up expired flash states
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updatedAlerts = new Map(alerts)
      let hasChanges = false
      
      updatedAlerts.forEach((alert, key) => {
        if (alert.flashStartTime) {
          const flashAge = now - alert.flashStartTime
          
          // Handle different flash behaviors
          if (alert.flashState === 'red' && alert.status === 'sentToRadios') {
            // Red flashing continues until accepted - do nothing
          } else if (alert.flashState === 'green' && flashAge > 10000) {
            // Green flash lasts exactly 10 seconds
            updatedAlerts.set(key, {
              ...alert,
              flashState: 'none',
              flashStartTime: undefined
            })
            hasChanges = true
            console.log(`🟢 Green flash expired for ${alert.wristbandId} after 10 seconds`)
          } else if (alert.flashState === 'red' && alert.status !== 'sentToRadios') {
            // Stop red flashes if call is no longer active
            updatedAlerts.set(key, {
              ...alert,
              flashState: 'none',
              flashStartTime: undefined
            })
            hasChanges = true
            console.log(`🔴 Red flash stopped for ${alert.wristbandId} - call no longer active`)
          }
        }
      })
      
      if (hasChanges) {
        setAlerts(updatedAlerts)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [alerts])

  const getWristbandAlerts = useCallback((wristbandId: string) => {
    const wristbandAlerts: ServiceCallAlert[] = []
    alerts.forEach((alert) => {
      if (alert.wristbandId === wristbandId) {
        wristbandAlerts.push(alert)
      }
    })
    return wristbandAlerts
  }, [alerts])

  const getServiceCallCount = useCallback((wristbandId: string) => {
    return getWristbandAlerts(wristbandId).length
  }, [getWristbandAlerts])

  const manualRefresh = useCallback(() => {
    disconnectSSE()
    setTimeout(() => connectSSE(), 1000)
  }, [connectSSE, disconnectSSE])

  const clearServiceCalls = useCallback(() => {
    console.log('🧹 Clearing all service calls and alerts')
    setServiceCalls([])
    setAlerts(new Map())
    setLastDataHash('')
    callStatusMapRef.current.clear()
    setLastUpdate(new Date())
  }, [])

  return {
    serviceCalls,
    alerts,
    loading,
    lastUpdate,
    isConnected,
    getWristbandAlerts,
    getServiceCallCount,
    refresh: manualRefresh,
    clearServiceCalls,
    connectSSE,
    disconnectSSE
  }
}
