"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type TraceITServiceItem } from "@/lib/traceit"
import { useToast } from "@/hooks/use-toast"
import { convertCustomDateToISO } from "@/lib/utils"
import { localAlarmManager } from "@/lib/local-alarm-manager"

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
    
    // Parse ACCEPT acknowledgments - updated pattern based on actual logs
    // Pattern: "cState.ProcessAlarmAcknowledge(31217, 0, AVIT)" 
    const ackMatch = line.match(/cState\.ProcessAlarmAcknowledge\((\d+),\s*(\d+),\s*(.+?)\)/i)
    if (ackMatch) {
      const alarmId = ackMatch[1]
      const ackByCode = ackMatch[2] 
      const ackByName = ackMatch[3].trim()
      
      console.log(`🟢 Found alarm acknowledgment: Alarm ${alarmId} acknowledged by ${ackByName} (code: ${ackByCode})`)
      
      // Extract timestamp from the current line if available
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[^\s]*)/i) ||
                            line.match(/^(\d{2}:\d{2}:\d{2}[^\s]*)/i) ||
                            line.match(/^(\[\d{2}:\d{2}:\d{2}\])/i)
      
      const ackTime = timestampMatch ? timestampMatch[1] : new Date().toISOString()
      
      acknowledgments.push({
        alarmId,
        ackBy: ackByName, // Use the name (AVIT) instead of code
        ackTime
      })
      
      console.log(`✅ Added acknowledgment: Alarm ${alarmId} by ${ackByName} at ${ackTime}`)
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
      
      // Reduce verbose parsing logs
      
      if (messageMatch) {
        const wristbandPrefix = messageMatch[1].trim() // "G2"
        const wristbandNumber = messageMatch[2].trim() // "505"
        vesselName = messageMatch[3].trim() // "Renaissance"
        location = messageMatch[4].trim() // "AV ROOM 232"
        
        // Create wristband ID (e.g., "G2 505")
        wristbandId = `${wristbandPrefix} ${wristbandNumber}`
        
        // Parsed successfully
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
          
          const serviceCall = {
            id: Math.floor(uniqueId),
            text: `Service call from ${wristbandId} in ${location}`,
            wristbands: [wristbandId],
            status: 'sentToRadios',
            timestamp: timestamp,
            ackBy: undefined,
            ackTime: undefined
          }
          
          stewCalls.set(callKey, serviceCall)
          
          console.log(`✅ NEW SERVICE CALL DETECTED:`, {
            port,
            wristbandId,
            location,
            callKey,
            isFirstOccurrence: true,
            serviceCall
          })
        } else {
          console.log(`🔄 DUPLICATE PORT DETECTED (this is normal - same call on port ${port}):`, {
            wristbandId,
            location,
            callKey,
            note: 'Same service call appears on ports 28007, 28008, 28009'
          })
        }
      } else {
        console.log(`⚠️ Failed to parse wristband/location from message: "${message}"`, {
          wristbandId,
          location,
          port,
          line: line.substring(0, 200) + '...'
        })
      }
    }
  }
  
  const finalNewCalls = Array.from(stewCalls.values())
  
  // Only log summary if there are actual service calls or acknowledgments
  if (finalNewCalls.length > 0 || acknowledgments.length > 0) {
    console.log(`🎯 Processed ${lines.length} lines: ${finalNewCalls.length} calls, ${acknowledgments.length} acks`)
    if (finalNewCalls.length > 0) {
      console.log(`📊 Service calls:`, finalNewCalls.map(call => `${call.wristbands[0]} in ${call.text.match(/in (.+)$/)?.[1] || 'unknown location'}`))
    }
  }
  
  return {
    newCalls: finalNewCalls,
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
  const serviceCallItems = items.filter((it) => 
    it.text.toLowerCase().includes('service') || 
    it.text.toLowerCase().includes('housekeeping') ||
    it.text.toLowerCase().includes('maintenance') ||
    it.wristbands.length > 0
  )

  console.log(`📊 Found ${serviceCallItems.length} service call items before date filtering`)

  // Fault-tolerant filtering: Remove old alarms that are likely stale
  const today = new Date()
  const todayDateString = today.toISOString().split('T')[0] // YYYY-MM-DD format
  
  console.log(`📅 Today's date: ${todayDateString}`)
  console.log(`🧪 TEMPORARILY DISABLING DATE FILTERING FOR DEBUG`)
  
  // Temporarily disable date filtering to debug toast issues
  const filteredItems = serviceCallItems.map((item, index) => {
    console.log(`📋 Item ${index}: ID=${item.id}, status="${item.status}", timestamp="${item.timestamp}", wristbands=[${item.wristbands.join(', ')}]`)
    return item
  })
  
  console.log(`📊 Returning ${filteredItems.length} items without date filtering`)
  return filteredItems
}

export function useLiveServiceCalls() {
  const [serviceCalls, setServiceCallsState] = useState<TraceITServiceItem[]>([])
  const [alerts, setAlertsState] = useState<Map<string, ServiceCallAlert>>(new Map())
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastDataHash, setLastDataHashState] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  
  // Console memory management - clear console periodically to prevent memory issues
  const consoleCleanupRef = useRef<number>(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      consoleCleanupRef.current++
      // Clear console every 100 operations to prevent memory buildup
      if (consoleCleanupRef.current % 100 === 0) {
        console.clear()
        console.log('🧹 Console cleared to prevent memory issues')
      }
    }, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  // Wrapper functions to update both state and refs
  const setServiceCalls = (calls: TraceITServiceItem[]) => {
    serviceCallsRef.current = calls
    setServiceCallsState(calls)
  }
  
  const setAlerts = (alertsMap: Map<string, ServiceCallAlert>) => {
    alertsRef.current = alertsMap
    setAlertsState(alertsMap)
    
    // Debug alert state changes for specific wristbands
    const g2505Alerts = Array.from(alertsMap.values()).filter(a => a.wristbandId === 'G2 505')
    const g2408Alerts = Array.from(alertsMap.values()).filter(a => a.wristbandId === 'G2 408')
    
    if (g2505Alerts.length > 0 || g2408Alerts.length > 0) {
      console.log(`🚨 Alerts updated:`, {
        total: alertsMap.size,
        g2505: g2505Alerts.map(a => `${a.status}:${a.flashState}`),
        g2408: g2408Alerts.map(a => `${a.status}:${a.flashState}`)
      })
    }
  }
  
  const setLastDataHash = (hash: string) => {
    lastDataHashRef.current = hash
    setLastDataHashState(hash)
  }
  
  // Use refs to track state and avoid stale closures
  const eventSourceRef = useRef<EventSource | null>(null)
  const callStatusMapRef = useRef<Map<number, { status: string, ackBy?: string, ackTime?: string }>>(new Map())
  const serviceCallsRef = useRef<TraceITServiceItem[]>([])
  const alertsRef = useRef<Map<string, ServiceCallAlert>>(new Map())
  const lastDataHashRef = useRef<string>('')

  // Create a simple hash of the data to detect changes
  const createDataHash = (calls: TraceITServiceItem[]): string => {
    return calls.map(call => `${call.id}-${call.text}-${call.wristbands.join(',')}-${call.status || ''}-${call.ackBy || ''}-${call.ackTime || ''}`).join('|')
  }

  const processLogData = useCallback((logData: string) => {
    const now = Date.now()
    
    // Reduce logging frequency - only log when there are actual changes
    const shouldLogDetails = serviceCallsRef.current.length === 0 || logData.includes('C28StewCallInterface')
    
    if (shouldLogDetails) {
      console.log('🔍 Processing log data - calls:', serviceCallsRef.current.length, 'alerts:', alertsRef.current.size)
    }
    
    try {
      // Parse C28StewCallInterface messages and acknowledgments from logs
      const { newCalls, acknowledgments } = parseC28StewCallLogs(logData, serviceCallsRef.current)
      
      if (shouldLogDetails && (newCalls.length > 0 || acknowledgments.length > 0)) {
        console.log(`📡 Found ${newCalls.length} service calls, ${acknowledgments.length} acknowledgments`)
        if (newCalls.length > 0) {
          console.log('📡 Service calls:', newCalls.map(call => `${call.wristbands[0]} in ${call.text.match(/in (.+)$/)?.[1] || 'unknown'}`))
        }
      }
      
      // Check if we have new calls that aren't locally managed
      const existingCallIds = new Set(serviceCallsRef.current.map(call => call.id))
      const newCallsList = newCalls.filter(call => !existingCallIds.has(call.id))
      
      // Filter out locally managed alarms from notifications
      const newUnmanagedCalls = newCallsList.filter(call => {
        const alarmId = `alarm_${call.id}`
        const localState = localAlarmManager.getAlarmState(alarmId)
        // Only notify for calls that are NOT locally managed (cleared, acknowledged, or hidden)
        return !localState || localState.status === 'active'
      })
      
      const hasNewUnmanagedCalls = newUnmanagedCalls.length > 0
      
      console.log(`🔔 Notification check: ${newCallsList.length} new calls, ${newUnmanagedCalls.length} unmanaged`)
      
      // Show notification only for truly new unmanaged calls
      if (hasNewUnmanagedCalls && serviceCallsRef.current.length > 0) {
        // Only show notification for new unmanaged calls, limit to most recent ones
        const recentNewCalls = newUnmanagedCalls.slice(-2) // Last 2 new calls only to prevent spam
        const newCallCount = recentNewCalls.length
        const newCallTexts = recentNewCalls.map(call => {
          // Extract just the wristband ID for cleaner notification
          const wristbandMatch = call.text.match(/Service call from (.+?) in/)
          const wristbandId = wristbandMatch ? wristbandMatch[1] : call.wristbands[0] || 'Unknown'
          console.log(`🚨 Toast notification for unmanaged call:`, {
            callId: call.id,
            callText: call.text,
            extractedWristband: wristbandMatch ? wristbandMatch[1] : 'No match',
            wristbandsArray: call.wristbands,
            finalWristbandId: wristbandId,
            timestamp: call.timestamp
          })
          return wristbandId
        }).join(', ')
        
        console.log(`🚨 === TOAST NOTIFICATION ===`)
        console.log(`🚨 Showing notification for ${newCallCount} new unmanaged service calls`)
        console.log(`🚨 Toast text: "${newCallTexts}"`)
        
        toast({
          title: "🚨 New Service Call",
          description: `${newCallTexts}`,
          variant: "destructive",
        })
      }
      
      // Process acknowledgments to update existing calls
      const updatedCalls = [...serviceCallsRef.current]
      const currentAlerts = new Map(alertsRef.current)
      let hasAcknowledgments = false
      
      acknowledgments.forEach(ack => {
        console.log(`🟢 === PROCESSING ACKNOWLEDGMENT ===`)
        console.log(`🟢 Alarm ID: ${ack.alarmId}, Acknowledged by: ${ack.ackBy}, Time: ${ack.ackTime}`)
        
        // Find the most recent unacknowledged alerts to mark as accepted
        // Since we don't have a direct alarm ID mapping, we'll use timing and status
        const unacknowledgedAlerts = Array.from(currentAlerts.entries())
          .filter(([key, alert]) => alert.status === 'sentToRadios')
          .sort((a, b) => {
            // Sort by timestamp (newest first)
            const timeA = new Date(a[1].timestamp).getTime()
            const timeB = new Date(b[1].timestamp).getTime()
            return timeB - timeA
          })
        
        console.log(`🟢 Found ${unacknowledgedAlerts.length} unacknowledged alerts:`, 
          unacknowledgedAlerts.map(([key, alert]) => `${alert.wristbandId} (${alert.callId})`))
        
        // Mark the most recent unacknowledged alerts as accepted (limit to prevent mass acceptance)
        const alertsToAccept = unacknowledgedAlerts.slice(0, 2) // Accept up to 2 most recent
        console.log(`🟢 Will accept ${alertsToAccept.length} alerts`)
        
        alertsToAccept.forEach(([alertKey, alert]) => {
          // Mark as flashed green to prevent re-flashing
          const ackAlarmId = `alarm_${alert.callId}`
          localAlarmManager.markAlarmFlashed(ackAlarmId, 'green')
          
          currentAlerts.set(alertKey, {
            ...alert,
            status: 'accepted',
            ackBy: ack.ackBy,
            ackTime: ack.ackTime,
            flashState: 'green',
            flashStartTime: now
          })
          hasAcknowledgments = true
          console.log(`🟢 NEW ACKNOWLEDGMENT: Updated alert ${alertKey} (${alert.wristbandId}) to accepted status by ${ack.ackBy}`)
          
          // Show green acceptance toast notification
          console.log(`🟢 === GREEN TOAST NOTIFICATION ===`)
          console.log(`🟢 Showing acceptance notification for ${alert.wristbandId}`)
          
          toast({
            title: "✅ Service Call Accepted",
            description: `${alert.wristbandId} acknowledged by ${ack.ackBy}`,
            variant: "default",
          })
        })
      })
      
      // Create hash of combined data (use original calls for hash, filtering is for display only)
      const newDataHash = createDataHash([...updatedCalls, ...newCalls])
      
      // Process if data has changed or we have new calls or acknowledgments
      const hasNewCalls = newCallsList.length > 0
      if (newDataHash !== lastDataHashRef.current || hasNewCalls || hasAcknowledgments) {
        console.log('🔄 Live log data changed, processing updates...')
        
        // Apply local alarm manager filtering to new calls
        const processedNewCalls = localAlarmManager.processIncomingAlarms(newCalls)
        const filteredNewCalls = processedNewCalls.filter(call => {
          const alarmId = `alarm_${call.id}`
          const localState = localAlarmManager.getAlarmState(alarmId)
          // Hide cleared and hidden alarms from display
          return !localState || (localState.status !== 'cleared' && localState.status !== 'hidden')
        })
        
        // Merge existing and filtered new calls
        const allCalls = [...updatedCalls]
        filteredNewCalls.forEach(newCall => {
          if (!existingCallIds.has(newCall.id)) {
            allCalls.push(newCall)
          }
        })
        
        console.log(`📱 Log processing: ${newCalls.length} raw → ${filteredNewCalls.length} filtered calls`)
        
        // Process new calls and update alerts
        const newAlerts = new Map(currentAlerts)
        
        // Add alerts for filtered new calls
        filteredNewCalls.forEach((call) => {
          if (!existingCallIds.has(call.id)) {
            call.wristbands.forEach((wristbandId: string) => {
              const alertKey = `${wristbandId}-${call.id}`
              
              const alert = {
                wristbandId,
                status: 'sentToRadios' as const,
                callId: call.id.toString(),
                text: call.text,
                timestamp: call.timestamp || new Date(now).toISOString(),
                ackBy: undefined,
                ackTime: undefined,
                flashState: 'red' as const,
                flashStartTime: now
              }
              
              // New alert - flash red for new service calls
              newAlerts.set(alertKey, alert)
              
              console.log(`🔴 NEW ALERT: ${wristbandId} → ${alert.flashState} (call ${call.id})`)
              console.log(`🔴 Alert details:`, { wristbandId, status: alert.status, flashState: alert.flashState, callId: alert.callId })
            })
          }
        })
        
        // Sort by ID descending (newest first)
        const sortedCalls = allCalls.sort((a, b) => b.id - a.id)
        
        setServiceCalls(sortedCalls)
        setAlerts(newAlerts)
        setLastDataHash(newDataHash)
        setLastUpdate(new Date())
      } else if (shouldLogDetails && newCalls.length === 0 && acknowledgments.length === 0) {
        console.log('📊 No service calls found in log data')
      }
    } catch (error) {
      console.error('❌ Error processing live log data:', error)
    }
  }, [toast]) // Only depend on toast since other values are accessed via refs and state

  const processServiceCallData = useCallback((xmlData: string) => {
    const now = Date.now()
    
    console.log('🔍 === PROCESSING XML START ===')
    console.log('📊 XML length:', xmlData.length)
    
    // Toast system confirmed working - removed test toast
    
    try {
      console.log('🔍 About to parse XML alarms...')
      const newCalls = parseXmlAlarms(xmlData)
      console.log('🔍 XML parsing completed successfully')
      console.log('🔍 XML parsing result:', newCalls.length, 'calls found (after filtering)')
      
      if (newCalls.length > 0) {
        console.log('🔍 XML Service calls details:', newCalls.map(call => ({ 
          id: call.id, 
          text: call.text, 
          wristbands: call.wristbands,
          status: call.status,
          timestamp: call.timestamp
        })))
      } else {
        console.log('📭 No valid service calls found after date filtering')
      }
      
      // Debug removed - toast system confirmed working
      
      // Create hash of new data
      const newDataHash = createDataHash(newCalls)
      
      // Check if we have new calls that aren't locally managed
      const existingCallIds = new Set(serviceCallsRef.current.map(call => call.id))
      const newCallsList = newCalls.filter(call => !existingCallIds.has(call.id))
      
      // Filter out locally managed alarms from notifications  
      const newUnmanagedCalls = newCallsList.filter(call => {
        const alarmId = `alarm_${call.id}`
        const localState = localAlarmManager.getAlarmState(alarmId)
        // Only notify for calls that are NOT locally managed
        return !localState || localState.status === 'active'
      })
      
      const hasNewCalls = newCallsList.length > 0
      const hasNewUnmanagedCalls = newUnmanagedCalls.length > 0
      
      console.log(`🔔 XML notification check: ${newCallsList.length} new calls, ${newUnmanagedCalls.length} unmanaged`)
      
      console.log('🔍 === TOAST DEBUG START ===')
      console.log('🔍 Existing calls count:', serviceCallsRef.current.length)
      console.log('🔍 New calls count:', newCalls.length)
      console.log('🔍 New calls list count:', newCallsList.length)
      console.log('🔍 Has new calls:', hasNewCalls)
      console.log('🔍 Existing call IDs:', Array.from(existingCallIds))
      console.log('🔍 New call IDs:', newCalls.map(c => c.id))
      console.log('🔍 New calls list:', newCallsList.map(c => ({ id: c.id, status: c.status, wristbands: c.wristbands })))
      
      // Check for newly accepted calls (status changed from active to accepted)
      console.log('🔍 === ACCEPTANCE DEBUG START ===')
      const newlyAcceptedCalls = newCalls.filter(call => {
        const existingCall = serviceCallsRef.current.find(existing => existing.id === call.id)
        console.log(`🔍 Checking call ${call.id}:`, { 
          hasExisting: !!existingCall, 
          currentStatus: call.status,
          existingStatus: existingCall?.status 
        })
        
        if (existingCall) {
          const wasActive = !existingCall.status || 
                          existingCall.status.toLowerCase() === 'senttoradios' || 
                          existingCall.status.toLowerCase() === 'active' ||
                          existingCall.status.toLowerCase() === 'sent' ||
                          existingCall.status.toLowerCase() === 'pending'
          const nowAccepted = call.status && 
                            (call.status.toLowerCase() === 'accepted' || 
                             call.status.toLowerCase() === 'acknowledged' ||
                             call.status.toLowerCase() === 'expired')
          
          console.log(`🔍 Status check for call ${call.id}: was "${existingCall.status}" (active: ${wasActive}), now "${call.status}" (accepted: ${nowAccepted})`)
          return wasActive && nowAccepted
        }
        return false
      })
      
      console.log('🔍 Newly accepted calls count:', newlyAcceptedCalls.length)
      
      // Show notification for newly accepted calls
      if (newlyAcceptedCalls.length > 0) {
        const acceptedCallTexts = newlyAcceptedCalls.map(call => {
          const wristbandMatch = call.text.match(/Service call from (.+?) in/)
          return wristbandMatch ? wristbandMatch[1] : call.wristbands[0] || 'Unknown'
        }).join(', ')
        
        console.log(`🟢 === ACCEPTANCE NOTIFICATION ===`)
        console.log(`🟢 Showing acceptance notification for ${newlyAcceptedCalls.length} calls`)
        console.log(`🟢 Wristbands: ${acceptedCallTexts}`)
        console.log(`🟢 Calls:`, newlyAcceptedCalls.map(call => ({ 
          id: call.id, 
          text: call.text, 
          wristbands: call.wristbands, 
          status: call.status 
        })))
        
        toast({
          title: "✅ Service Call Accepted",
          description: `${acceptedCallTexts}`,
          variant: "default",
          duration: 5000, // Show for 5 seconds
        })
      }
      
      // Show toast notifications for NEW service calls (not accepted ones)
      console.log('🔍 === NEW CALL TOAST DEBUG ===')
      console.log('🔍 Has new calls:', hasNewCalls)
      console.log('🔍 Existing calls length:', serviceCallsRef.current.length)
      console.log('🔍 Original toast condition met:', hasNewCalls && serviceCallsRef.current.length > 0)
      console.log('🔍 Modified condition (allowing first call):', hasNewCalls)
      
      // Only show notifications for new unmanaged calls
      if (hasNewUnmanagedCalls) {
        // Filter for truly new unmanaged calls that are active
        const activeNewCalls = newUnmanagedCalls.filter(call => {
          const status = call.status?.toLowerCase()
          const isActive = !status || 
                          status === 'active' || 
                          status === 'sent' || 
                          status === 'senttoradios' || 
                          status === 'pending' ||
                          status === 'livenew'  // Add livenew as active status
          console.log(`🔍 Unmanaged call ${call.id} status "${status}" is active: ${isActive}`)
          return isActive
        }).slice(-2) // Last 2 new active calls only
        
        console.log('🔍 Active new unmanaged calls count:', activeNewCalls.length)
        console.log('🔍 Active new unmanaged calls:', activeNewCalls.map(c => ({ id: c.id, status: c.status, wristbands: c.wristbands })))
        
        if (activeNewCalls.length > 0) {
          const newCallTexts = activeNewCalls.map(call => {
            const wristbandMatch = call.text.match(/Service call from (.+?) in/)
            return wristbandMatch ? wristbandMatch[1] : call.wristbands[0] || 'Unknown'
          }).join(', ')
          
          console.log(`🚨 === NEW SERVICE CALL NOTIFICATION ===`)
          console.log(`🚨 Showing notification for ${activeNewCalls.length} new unmanaged service calls`)
          console.log(`🚨 Wristbands: ${newCallTexts}`)
          
          toast({
            title: "🚨 New Service Call",
            description: `${newCallTexts} - Click to view`,
            variant: "destructive",
            duration: 10000, // Show for 10 seconds
            onClick: () => {
              // Navigate to live tracking page and highlight the wristband
              console.log('🧭 Navigating to live tracking for:', newCallTexts)
              const wristbandId = activeNewCalls[0].wristbands[0]
              if (wristbandId) {
                // Scroll to the wristband card
                const element = document.querySelector(`[data-wristband-id="${wristbandId}"]`)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  // Add temporary highlight effect
                  element.classList.add('ring-4', 'ring-red-500')
                  setTimeout(() => {
                    element.classList.remove('ring-4', 'ring-red-500')
                  }, 3000)
                }
              }
            }
          })
        } else {
          console.log(`📊 XML found ${newCallsList.length} calls but all are locally managed - no notification needed`)
        }
      } else if (newCallsList.length > 0) {
        console.log(`📊 XML found ${newCallsList.length} new calls but all are locally managed - no notification needed`)
      }
      
      // Process if data has changed or we have new calls
      if (newDataHash !== lastDataHashRef.current || hasNewCalls) {
        console.log('🔄 Live service calls data changed, processing updates...')
        
        // Apply local alarm manager filtering - remove locally cleared/hidden alarms
        const processedCalls = localAlarmManager.processIncomingAlarms(newCalls)
        const filteredCalls = processedCalls.filter(call => {
          const alarmId = `alarm_${call.id}`
          const localState = localAlarmManager.getAlarmState(alarmId)
          // Hide cleared and hidden alarms from display
          return !localState || (localState.status !== 'cleared' && localState.status !== 'hidden')
        })
        
        console.log(`📱 Filtered ${newCalls.length} calls → ${filteredCalls.length} calls (${newCalls.length - filteredCalls.length} locally managed)`)
        
        // Process filtered calls and update alerts
        const newAlerts = new Map<string, ServiceCallAlert>()
        
        // Sort by ID descending (newest first)
        const recentCalls = filteredCalls.sort((a, b) => b.id - a.id)
        
        recentCalls.forEach((call) => {
          // Check existing status FIRST, then local alarm manager state
          const existingStatus = callStatusMapRef.current.get(call.id)
          const alarmId = `alarm_${call.id}`
          const localState = localAlarmManager.getAlarmState(alarmId)
          
          let status: 'sentToRadios' | 'accepted' | 'expired' = 'sentToRadios'
          let ackBy: string | undefined
          let ackTime: string | undefined
          
          // PRIORITY 1: Local alarm manager state (highest priority)
          if (localState && localState.status === 'acknowledged') {
            status = 'accepted'
            ackBy = localState.acknowledgedBy || 'Local'
            ackTime = localState.acknowledgedAt || new Date().toISOString()
            console.log(`📱 Using local state for call ${call.id}: ${status} by ${ackBy}`)
          }
          // PRIORITY 2: Existing status in memory
          else if (existingStatus) {
            status = existingStatus.status as 'sentToRadios' | 'accepted' | 'expired'
            ackBy = existingStatus.ackBy
            ackTime = existingStatus.ackTime
            console.log(`💾 Using existing status for call ${call.id}: ${status}`)
          }
          // PRIORITY 3: Server/API status (lowest priority)
          else {
            // Use actual status from API if available
            if (call.status) {
              const apiStatus = call.status.toLowerCase()
              if (apiStatus === 'expired' || apiStatus === 'accepted' || apiStatus === 'acknowledged') {
                status = 'accepted'
              } else if (apiStatus === 'sent' || apiStatus === 'active' || apiStatus === 'pending' || apiStatus === 'livenew') {
                status = 'sentToRadios'
              }
              
              if (call.ackBy) {
                ackBy = call.ackBy
              }
              if (call.ackTime) {
                ackTime = call.ackTime
              }
            }
            console.log(`🌐 Using server status for call ${call.id}: ${status}`)
          }
          
          // Always store/update the status
          callStatusMapRef.current.set(call.id, { status, ackBy, ackTime })
          
          // Create alerts for each wristband
          call.wristbands.forEach((wristbandId: string) => {
            const alertKey = `${wristbandId}-${call.id}`
            const existingAlert = alertsRef.current.get(alertKey)
            
            let flashState: 'red' | 'green' | 'none' = 'none'
            let flashStartTime: number | undefined
            
            // Check local state first for flash logic
            if (localState && localState.status === 'acknowledged') {
              // Locally acknowledged - keep green flash for a bit then stop
              if (existingAlert && existingAlert.flashState === 'green') {
                const flashAge = now - (existingAlert.flashStartTime || 0)
                if (flashAge < 10000) { // 10 seconds
                  flashState = 'green'
                  flashStartTime = existingAlert.flashStartTime
                } else {
                  flashState = 'none' // Stop flashing after 10 seconds
                }
              } else if (!existingAlert || existingAlert.status !== 'accepted') {
                // Just became acknowledged - start green flash only if not already flashed
                const alarmId = `alarm_${call.id}`
                if (!localAlarmManager.hasAlarmFlashed(alarmId, 'green')) {
                  flashState = 'green'
                  flashStartTime = now
                  localAlarmManager.markAlarmFlashed(alarmId, 'green')
                  console.log(`🟢 LOCAL ACKNOWLEDGMENT: ${wristbandId} call ${call.id} acknowledged locally (first green flash)`)
                } else {
                  console.log(`🟢 LOCAL ACKNOWLEDGMENT: ${wristbandId} call ${call.id} already flashed green - no re-flash`)
                  flashState = 'none'
                }
              }
            }
            else if (existingAlert) {
              // Check for status changes
              if (existingAlert.status === 'sentToRadios' && (status === 'accepted' || status === 'expired')) {
                const alarmId = `alarm_${call.id}`
                // Only flash green if we haven't already flashed this alarm green
                if (!localAlarmManager.hasAlarmFlashed(alarmId, 'green')) {
                  flashState = 'green'
                  flashStartTime = now
                  localAlarmManager.markAlarmFlashed(alarmId, 'green')
                  console.log(`🟢 ALERT STATUS CHANGE: ${wristbandId} call ${call.id} - ${existingAlert.status} → ${status} (first green flash)`)
                } else {
                  console.log(`🟢 Call ${call.id} for ${wristbandId} already flashed green - no re-flash`)
                  flashState = 'none'
                }
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
              // New alert - check if we've already flashed this alarm
              const alarmId = `alarm_${call.id}`
              
              if (status === 'sentToRadios') {
                // Only flash red if we haven't already flashed this alarm red
                if (!localAlarmManager.hasAlarmFlashed(alarmId, 'red')) {
                  flashState = 'red'
                  flashStartTime = now
                  localAlarmManager.markAlarmFlashed(alarmId, 'red')
                  console.log(`🔴 New service call detected for ${wristbandId} - call ${call.id} (first red flash)`)
                } else {
                  console.log(`🔴 Service call ${call.id} for ${wristbandId} already flashed red - no re-flash`)
                  flashState = 'none'
                }
              } else {
                // For already accepted calls, don't flash at all initially
                // They may have been accepted before we saw them
                flashState = 'none'
                console.log(`📝 Call ${call.id} for ${wristbandId} already accepted - no flash`)
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
  }, [toast]) // Only depend on toast since we're using XML as fallback

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log('🔄 Connecting to live service calls SSE...')
    console.log('🧹 Clearing existing service calls and alerts on reconnect')
    
    // Clear existing data to start fresh
    setServiceCalls([])
    setAlerts(new Map())
    setLastDataHash('')
    callStatusMapRef.current.clear()
    
    const eventSource = new EventSource('/api/service-calls/live')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened for service calls')
      console.log('✅ Event source ready state:', eventSource.readyState)
      setIsConnected(true)
      setLoading(false)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Only log important SSE messages, not heartbeats
        if (data.type !== 'heartbeat') {
          console.log('📨 SSE:', data.type)
        }
        
        switch (data.type) {
          case 'connected':
            console.log('🔗 SSE service calls stream connected')
            break
          case 'log_data':
            console.log('🎯 === LOG DATA RECEIVED ===')
            console.log('📡 Log data length:', data.data.length)
            console.log('📡 Log source:', data.source || 'unknown')
            if (data.data.includes('ProcessAlarmAcknowledge')) {
              console.log('🟢 ✅ LOG CONTAINS ProcessAlarmAcknowledge - this should trigger green notifications!')
            }
            if (data.data.includes('C28StewCallInterface')) {
              console.log('🟢 ✅ LOG CONTAINS C28StewCallInterface - service calls detected!')
            }
            processLogData(data.data)
            break
          case 'alarm_data':
            console.log('📡 === XML FALLBACK ===')
            console.log('⚠️ Using XML fallback - real-time acknowledgments may not work properly')
            console.log('📡 XML data length:', data.data.length)
            try {
              processServiceCallData(data.data)
              console.log('📡 XML processing completed')
            } catch (error) {
              console.error('❌ XML processing failed:', error)
            }
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
  }, []) // Remove processServiceCallData dependency since we're using processLogData instead

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
  }, []) // Remove dependencies to prevent infinite loop

  // Clean up expired flash states
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updatedAlerts = new Map(alertsRef.current)
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
  }, []) // Use ref instead of alerts dependency

  const getWristbandAlerts = useCallback((wristbandId: string) => {
    const wristbandAlerts: ServiceCallAlert[] = []
    alertsRef.current.forEach((alert) => {
      if (alert.wristbandId === wristbandId) {
        wristbandAlerts.push(alert)
      }
    })
    return wristbandAlerts
  }, [])

  const getServiceCallCount = useCallback((wristbandId: string) => {
    return getWristbandAlerts(wristbandId).length
  }, [getWristbandAlerts])

  const manualRefresh = useCallback(() => {
    disconnectSSE()
    setTimeout(() => connectSSE(), 1000)
  }, []) // Remove dependencies to prevent recreation

  const clearServiceCalls = useCallback(() => {
    console.log('🧹 Clearing all service calls and alerts locally')
    
    // Use local alarm manager to clear all active alarms
    const clearedCount = localAlarmManager.clearAllAlarms('System Clear')
    
    // Clear all local state immediately
    setServiceCalls([])
    setAlerts(new Map())
    setLastDataHash('')
    callStatusMapRef.current.clear()
    
    // Reset refs to empty state
    serviceCallsRef.current = []
    alertsRef.current = new Map()
    lastDataHashRef.current = ''
    
    setLastUpdate(new Date())
    
    const stats = localAlarmManager.getStats()
    console.log('📊 Local alarm stats after clear:', stats)
    
    toast({
      title: "🧹 Service Calls Cleared",
      description: `${clearedCount} active alarms cleared locally. They won't reappear.`,
      variant: "default",
      duration: 5000,
    })
    
    console.log('✅ All service calls and alerts cleared locally')
  }, [toast])

  const acceptServiceCall = useCallback((wristbandId: string, callId?: string) => {
    console.log(`🟢 Manually accepting service call for ${wristbandId}${callId ? ` (call ${callId})` : ''}`)
    
    const currentAlerts = new Map(alertsRef.current)
    let updatedCount = 0
    const acknowledgedAlarmIds: string[] = []
    
    // If callId specified, accept specific call; otherwise accept all for wristband
    for (const [alertKey, alert] of currentAlerts.entries()) {
      if (alert.wristbandId === wristbandId) {
        if (!callId || alert.callId === callId) {
          // Use local alarm manager to acknowledge
          const alarmId = `alarm_${alert.callId}`
          localAlarmManager.acknowledgeAlarm(alarmId, 'Manual')
          acknowledgedAlarmIds.push(alarmId)
          
          // Mark as flashed green to prevent re-flashing
          localAlarmManager.markAlarmFlashed(alarmId, 'green')
          
          currentAlerts.set(alertKey, {
            ...alert,
            status: 'accepted',
            ackBy: 'Manual',
            ackTime: new Date().toISOString(),
            flashState: 'green',
            flashStartTime: Date.now()
          })
          updatedCount++
          
          // Update call status map
          callStatusMapRef.current.set(parseInt(alert.callId), {
            status: 'accepted',
            ackBy: 'Manual',
            ackTime: new Date().toISOString()
          })
        }
      }
    }
    
    if (updatedCount > 0) {
      setAlerts(currentAlerts)
      
      toast({
        title: "✅ Service Call Accepted",
        description: `${wristbandId} - ${updatedCount} call(s) accepted locally`,
        variant: "default",
        duration: 3000,
      })
      
      console.log(`✅ Manually accepted ${updatedCount} alerts for ${wristbandId} (alarm IDs: ${acknowledgedAlarmIds.join(', ')})`)
    } else {
      console.log(`⚠️ No alerts found to accept for ${wristbandId}`)
    }
  }, [toast])

  const acceptAllServiceCalls = useCallback(() => {
    console.log('🟢 Manually accepting ALL service calls')
    
    const currentAlerts = new Map(alertsRef.current)
    let updatedCount = 0
    const acknowledgedAlarmIds: string[] = []
    
    for (const [alertKey, alert] of currentAlerts.entries()) {
      if (alert.status === 'sentToRadios') {
        // Use local alarm manager to acknowledge
        const alarmId = `alarm_${alert.callId}`
        localAlarmManager.acknowledgeAlarm(alarmId, 'Manual')
        acknowledgedAlarmIds.push(alarmId)
        
        // Mark as flashed green to prevent re-flashing
        localAlarmManager.markAlarmFlashed(alarmId, 'green')
        
        currentAlerts.set(alertKey, {
          ...alert,
          status: 'accepted',
          ackBy: 'Manual',
          ackTime: new Date().toISOString(),
          flashState: 'green',
          flashStartTime: Date.now()
        })
        updatedCount++
        
        // Update call status map
        callStatusMapRef.current.set(parseInt(alert.callId), {
          status: 'accepted',
          ackBy: 'Manual',
          ackTime: new Date().toISOString()
        })
      }
    }
    
    if (updatedCount > 0) {
      setAlerts(currentAlerts)
      
      toast({
        title: "✅ All Service Calls Accepted",
        description: `${updatedCount} call(s) accepted locally`,
        variant: "default",
        duration: 3000,
      })
      
      console.log(`✅ Manually accepted ${updatedCount} alerts total (alarm IDs: ${acknowledgedAlarmIds.join(', ')})`)
    } else {
      console.log(`⚠️ No active alerts found to accept`)
    }
  }, [toast])

  return {
    serviceCalls,
    alerts,
    loading,
    lastUpdate,
    isConnected,
    getWristbandAlerts,
    getServiceCallCount,
    refresh: manualRefresh,
    clearServiceCalls: clearServiceCalls, // Explicitly export clear function
    acceptServiceCall,
    acceptAllServiceCalls,
    connectSSE,
    disconnectSSE
  }
}
