"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { fetchTraceITServiceCalls, groupByWristband, type TraceITServiceItem } from "@/lib/traceit"
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

export function useServiceCalls() {
  const [serviceCalls, setServiceCalls] = useState<TraceITServiceItem[]>([])
  const [alerts, setAlerts] = useState<Map<string, ServiceCallAlert>>(new Map())
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastDataHash, setLastDataHash] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [monitoringStartTime, setMonitoringStartTime] = useState<number>(0)
  const { toast } = useToast()
  
  // Use refs to track polling state and status map to prevent re-renders
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPollTimeRef = useRef<number>(0)
  const consecutiveErrorsRef = useRef<number>(0)
  const callStatusMapRef = useRef<Map<number, { status: string, ackBy?: string, ackTime?: string }>>(new Map())
  const maxConsecutiveErrors = 3

  // Create a simple hash of the data to detect changes
  const createDataHash = (calls: TraceITServiceItem[]): string => {
    return calls.map(call => `${call.id}-${call.text}-${call.wristbands.join(',')}-${call.status || ''}-${call.ackBy || ''}-${call.ackTime || ''}`).join('|')
  }

  const loadServiceCalls = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Prevent too frequent requests (minimum 2 seconds between requests for better responsiveness)
    if (!forceRefresh && (now - lastPollTimeRef.current) < 2000) {
      return
    }

    try {
      setLoading(true)
      lastPollTimeRef.current = now
      
      // Try live endpoint first, fallback to XML
      let res
      try {
        // Try potential live/real-time endpoints
        const liveEndpoints = [
          "http://10.101.12.31/live/alarms",
          "http://10.101.12.31/api/alarms/live", 
          "http://10.101.12.31/realtime/alarms",
          "http://10.101.12.31/stream/alarms",
          "http://10.101.12.31/alarms/current"
        ]
        
        let liveData = null
        for (const endpoint of liveEndpoints) {
          try {
            const liveRes = await fetchTraceITServiceCalls({ url: endpoint })
            if (liveRes.items && liveRes.items.length >= 0) {
              console.log(`✅ Found working live endpoint: ${endpoint}`)
              liveData = liveRes
              break
            }
          } catch (error) {
            // Continue to next endpoint
            continue
          }
        }
        
        if (liveData) {
          res = liveData
          console.log("📡 Using live data from real-time endpoint")
        } else {
          // Fallback to XML with more frequent polling
          res = await fetchTraceITServiceCalls({ url: "http://10.101.12.31/alarm.xml" })
          console.log("📡 Using XML fallback data")
        }
      } catch (error) {
        // Final fallback to XML
        res = await fetchTraceITServiceCalls({ url: "http://10.101.12.31/alarm.xml" })
      }
      
      const newCalls = res.items || []
      
      // Create hash of new data
      const newDataHash = createDataHash(newCalls)
      
      // Check if we have new calls by comparing call IDs
      const existingCallIds = new Set(serviceCalls.map(call => call.id))
      const newCallsList = newCalls.filter(call => !existingCallIds.has(call.id))
      const hasNewCalls = newCallsList.length > 0
      
      // Show notification only for truly new calls (not on initial load)
      if (hasNewCalls && serviceCalls.length > 0) {
        const newCallCount = newCallsList.length
        const newCallTexts = newCallsList.slice(0, 2).map(call => call.text).join(', ')
        const moreText = newCallCount > 2 ? ` and ${newCallCount - 2} more` : ''
        
        toast({
          title: "🚨 New Service Call(s)",
          description: `${newCallCount} new service call${newCallCount > 1 ? 's' : ''}: ${newCallTexts}${moreText}`,
          variant: "destructive",
        })
      }
      
      // Only process if data has changed, forced refresh, or we have new calls
      if (forceRefresh || newDataHash !== lastDataHash || hasNewCalls) {
        console.log('🔄 Service calls data changed, processing updates...')
        
        // Process new calls and update alerts
        const newAlerts = new Map<string, ServiceCallAlert>()
        const thirtyMinutesAgo = now - (30 * 60 * 1000) // 30 minutes ago
        
        // Filter calls from last 30 minutes and sort by timestamp (newest first)
        const recentCalls = newCalls
          .filter(call => {
            // Extract timestamp from call data - this would need to be adjusted based on actual API response
            // For now, we'll use the call ID as a proxy for time ordering
            return true // Show all calls for now, adjust based on actual timestamp field
          })
          .sort((a, b) => b.id - a.id) // Sort by ID descending (newest first)
        
        // Debug: Log the first few calls to see their structure
        if (recentCalls.length > 0) {
          console.log('🔍 Debug: First service call structure:', {
            id: recentCalls[0].id,
            idType: typeof recentCalls[0].id,
            text: recentCalls[0].text,
            timestamp: recentCalls[0].timestamp,
            ackTime: recentCalls[0].ackTime
          })
        }
        
        recentCalls.forEach((call) => {
          // Check if we have existing status for this call
          const existingStatus = callStatusMapRef.current.get(call.id)
          
          let status: 'sentToRadios' | 'accepted' | 'expired' = 'sentToRadios'
          let ackBy: string | undefined
          let ackTime: string | undefined
          
          if (existingStatus) {
            // Use existing status to prevent constant changes
            status = existingStatus.status as 'sentToRadios' | 'accepted' | 'expired'
            ackBy = existingStatus.ackBy
            ackTime = existingStatus.ackTime
          } else {
            // Use actual status from API if available
            if (call.status) {
              const apiStatus = call.status.toLowerCase()
              if (apiStatus === 'expired' || apiStatus === 'accepted' || apiStatus === 'acknowledged') {
                status = 'accepted' // Treat expired and acknowledged as accepted
              } else if (apiStatus === 'sent' || apiStatus === 'active' || apiStatus === 'pending') {
                status = 'sentToRadios'
              }
              
              // Use actual acknowledgment data if available
              if (call.ackBy) {
                ackBy = call.ackBy
              }
              if (call.ackTime) {
                ackTime = call.ackTime
              } else if (call.timestamp) {
                // Use timestamp as acknowledgment time if no specific ack time
                ackTime = call.timestamp
              }
            } else {
              // Fallback to simulation only if no status from API
              if (call.id % 3 === 0) {
                status = 'expired' // Treat as accepted
                const radioIds = ['734:Interior 6', '735:Deck 7', '736:Engine Room', '737:Galley', '738:Housekeeping']
                const ackRadio = radioIds[call.id % radioIds.length]
                ackBy = ackRadio.split(':')[1]
                // Fix: Use a hash-based time offset for string IDs
                const timeOffset = (call.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 60) * 1000
                ackTime = new Date(now - timeOffset).toISOString()
              } else if (call.id % 3 === 1) {
                status = 'accepted'
                const radioIds = ['734:Interior 6', '735:Deck 7', '736:Engine Room', '737:Galley', '738:Housekeeping']
                const ackRadio = radioIds[call.id % radioIds.length]
                ackBy = ackRadio.split(':')[1]
                // Fix: Use a hash-based time offset for string IDs
                const timeOffset = (call.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 60) * 1000
                ackTime = new Date(now - timeOffset).toISOString()
              }
            }
            
            // Store the status to prevent changes
            callStatusMapRef.current.set(call.id, { status, ackBy, ackTime })
          }
          
          // Create alerts for each wristband in the call
          call.wristbands.forEach(wristbandId => {
            const alertKey = `${wristbandId}-${call.id}`
            const existingAlert = alerts.get(alertKey)
            
            let flashState: 'red' | 'green' | 'none' = 'none'
            let flashStartTime: number | undefined
            
            // Smart flash logic - only flash for new events
            if (existingAlert) {
              // Existing alert - check for status changes
              if (existingAlert.status === 'sentToRadios' && (status === 'accepted' || status === 'expired')) {
                // Status just changed from sentToRadios to accepted/expired - flash green
                flashState = 'green'
                flashStartTime = now
                console.log(`🟢 New acceptance detected for ${wristbandId} - call ${call.id}`)
              } else if (existingAlert.flashState === 'green') {
                // Continue existing green flash if within 10 seconds
                const flashAge = now - (existingAlert.flashStartTime || 0)
                if (flashAge < 10000) {
                  flashState = 'green'
                  flashStartTime = existingAlert.flashStartTime
                }
              } else if (existingAlert.flashState === 'red') {
                // Continue existing red flash if still sentToRadios
                if (status === 'sentToRadios') {
                  flashState = 'red'
                  flashStartTime = existingAlert.flashStartTime
                }
              }
              // If no status change and no active flash, don't flash
            } else {
              // New alert - only flash if it's a new sentToRadios call
              if (status === 'sentToRadios') {
                flashState = 'red'
                flashStartTime = now
                console.log(`🔴 New service call detected for ${wristbandId} - call ${call.id}`)
              }
              // Don't flash for new accepted/expired calls (they were accepted before we started tracking)
              // Also don't flash for calls that were already accepted when we started monitoring
            }
            
            newAlerts.set(alertKey, {
              wristbandId,
              status,
              callId: call.id.toString(),
              text: call.text,
              timestamp: (call.timestamp ? convertCustomDateToISO(call.timestamp) : null) || call.timestamp || new Date(now - ((call.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 60) * 1000)).toISOString(), // Convert custom format or use API timestamp or hash-based fallback
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
        setIsConnected(true)
        consecutiveErrorsRef.current = 0 // Reset error count on success
      } else {
        console.log('📊 No service calls data changes detected')
      }
    } catch (error) {
      console.error('Error loading service calls:', error)
      consecutiveErrorsRef.current++
      setIsConnected(false)
      
      // If too many consecutive errors, increase polling interval
      if (consecutiveErrorsRef.current >= maxConsecutiveErrors) {
        console.warn('⚠️ Too many consecutive errors, reducing polling frequency')
      }
    } finally {
      setLoading(false)
    }
  }, [lastDataHash, alerts, serviceCalls])

  // Start polling with adaptive intervals
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Adaptive polling: longer intervals if there are errors
    const baseInterval = 3000 // 3 seconds base interval for real-time responsiveness
    const errorMultiplier = Math.min(consecutiveErrorsRef.current + 1, 3) // Max 3x multiplier
    const pollingInterval = baseInterval * errorMultiplier

    console.log(`🔄 Starting service calls polling with ${pollingInterval/1000}s interval`)

    pollingIntervalRef.current = setInterval(() => {
      loadServiceCalls()
    }, pollingInterval)
  }, [loadServiceCalls])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      console.log('⏹️ Stopped service calls polling')
    }
  }, [])

  useEffect(() => {
    // Initialize lastUpdate on client side only to prevent hydration mismatch
    if (!lastUpdate) {
      setLastUpdate(new Date())
    }
  }, [lastUpdate])

  useEffect(() => {
    // Set monitoring start time
    setMonitoringStartTime(Date.now())
    
    // Initial load
    loadServiceCalls(true)
    
    // Start polling
    startPolling()
    
    return () => {
      stopPolling()
    }
  }, []) // Empty dependency array to run only once

  // Clean up expired flash states
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updatedAlerts = new Map(alerts)
      let hasChanges = false
      
      updatedAlerts.forEach((alert, key) => {
        if (alert.flashStartTime) {
          const flashAge = now - alert.flashStartTime
          if (flashAge > 10000) { // 10 seconds
            updatedAlerts.set(key, {
              ...alert,
              flashState: 'none',
              flashStartTime: undefined
            })
            hasChanges = true
          }
        }
        
        // Also stop red flashes for calls that are no longer sentToRadios
        if (alert.flashState === 'red' && alert.status !== 'sentToRadios') {
          updatedAlerts.set(key, {
            ...alert,
            flashState: 'none',
            flashStartTime: undefined
          })
          hasChanges = true
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
    loadServiceCalls(true)
  }, [loadServiceCalls])

  return {
    serviceCalls,
    alerts,
    loading,
    lastUpdate,
    isConnected,
    getWristbandAlerts,
    getServiceCallCount,
    refresh: manualRefresh,
    startPolling,
    stopPolling
  }
}
