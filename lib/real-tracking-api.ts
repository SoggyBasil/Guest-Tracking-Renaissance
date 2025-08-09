"use client"

import { useState, useEffect, useCallback } from "react"

// Real tracking API endpoint
const TRACKING_API_ENDPOINT = "http://myyachtservices.itwservices.local:8020"

// Real wristband data from API
export interface WristbandData {
  id: string
  wristbandId: string
  guestName: string
  guestEmail?: string
  signalStrength: number
  lastSeen: string
  location: string
  cabinNumber?: string
  status: "active" | "inactive" | "maintenance"
  alerts: string[]
  isOnTheMove: boolean
  previousLocation?: string
  locationChangedAt?: string
  group: 'Family' | 'Guest' | 'Test'
}

export interface TrackingStats {
  totalWristbands: number
  activeWristbands: number
  onTheMoveCount: number
  maintenanceCount: number
  averageSignal: number
}

// Real-time tracking system using actual API
class RealTrackingSystem {
  private listeners: ((data: WristbandData[]) => void)[] = []
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private currentData: WristbandData[] = []
  private signalLevels = new Map<string, { value: number, lastChanged: number, lastSeen: number }>()
  private rawApiResponses = new Map<string, { response: string, timestamp: number }>()
  private deviceStatus = new Map<string, { isOffline: boolean, lastStatusChange: number, wentOfflineAt?: number }>()
  private onlineNotificationCallbacks: ((deviceId: string) => void)[] = []
  private offlineNotificationCallbacks: ((deviceId: string, offlineTime: number) => void)[] = []

  constructor() {
    console.log("🔄 Initializing Real Tracking System with API:", TRACKING_API_ENDPOINT)
  }

  private async fetchWristbandData(): Promise<WristbandData[]> {
    // Based on the tracking engine code, the correct endpoint is /Track/GetItems/
    const endpoint = '/Track/GetItems/'
    
    try {
      console.log(`🔍 Trying endpoint: ${TRACKING_API_ENDPOINT}${endpoint}`)
      
      const response = await fetch(`${TRACKING_API_ENDPOINT}${endpoint}`, {
        method: 'POST', // The tracking engine uses POST
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Success! Found working endpoint: ${endpoint}`)
        console.log("📡 Received data from API:", data)
        
        // Transform API data to match our interface
        return this.transformApiData(data)
      } else {
        console.log(`❌ Endpoint ${endpoint} returned ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.log(`❌ Endpoint ${endpoint} failed:`, error)
    }

    console.error("❌ API endpoint failed. Please check your API endpoint and available routes.")
    return []
  }

  private transformApiData(apiData: any): WristbandData[] {
    // Transform the API response to match our WristbandData interface
    // Based on the tracking engine code, the API returns { Tracks: [...] }
    console.log("🔄 Transforming API data:", apiData)
    
    // Debug: check for G2 507 in raw data
    if (apiData && apiData.Tracks) {
      const g2507 = apiData.Tracks.find((track: any) => track.Name === 'G2 507')
      if (g2507) {
        console.log("🔍 Raw G2 507 data from API:", g2507)
      }
    }
    
    if (apiData && apiData.Tracks && Array.isArray(apiData.Tracks)) {
      return apiData.Tracks.map((track: any) => {
        const wristbandId = track.Name || 'Unknown'
        const location = track.Room || track.Message || 'Unknown Location'
        const signalStrength = track.Value || 0
        
        // Determine wristband group
        const group = this.getWristbandGroup(wristbandId)
        
        // Check if API response actually changed for this device
        const apiResponseChanged = this.updateApiResponse(wristbandId, track)
        
        // Update signal level tracking for this device
        this.updateSignalLevel(wristbandId, signalStrength)
        
        // Check if offline (signal 0, location UNKNOWN, or API response hasn't changed in 1 minute)
        const isOfflineBySignal = signalStrength === 0 || location.toLowerCase().includes('unknown')
        const isOfflineByTimeout = this.isApiResponseStale(wristbandId)
        const isOffline = isOfflineBySignal || isOfflineByTimeout

        // Track device status changes for notifications
        this.updateDeviceStatus(wristbandId, isOffline)
        
        // Debug logging for G2 507 specifically
        if (wristbandId === 'G2 507') {
          const signalInfo = this.getSignalInfo(wristbandId)
          console.log(`🔍 DEBUG G2 507:`, {
            currentSignal: signalStrength,
            location: location,
            isOfflineBySignal,
            isOfflineByTimeout,
            isOffline,
            signalInfo: signalInfo ? {
              value: signalInfo.value,
              lastChanged: new Date(signalInfo.lastChanged).toLocaleTimeString(),
              lastSeen: new Date(signalInfo.lastSeen).toLocaleTimeString(),
              timeSinceChange: Math.round((Date.now() - signalInfo.lastChanged) / 1000)
            } : 'none'
          })
        }
        
        // Check if on the move (location changed)
        const previousLocation = this.getPreviousLocation(wristbandId)
        const locationChanged = previousLocation && previousLocation !== location && !isOffline
        
        // Handle movement timeout
        let isOnTheMove = false
        if (locationChanged) {
          // Start movement tracking
          this.setMovementStartTime(wristbandId)
          isOnTheMove = true
        } else if (this.movementStartTimes.has(wristbandId)) {
          // Check if movement has expired
          if (this.isMovementExpired(wristbandId)) {
            this.clearMovementStartTime(wristbandId)
            isOnTheMove = false
          } else {
            isOnTheMove = true
          }
        }
        
        // Update previous location for next comparison
        this.updatePreviousLocation(wristbandId, location)
        
        // Get signal tracking info for accurate lastSeen
        const signalInfo = this.getSignalInfo(wristbandId)
        const actualLastSeen = signalInfo 
          ? new Date(signalInfo.lastSeen).toISOString()
          : (track.LastSeen || new Date().toISOString())

        return {
          id: wristbandId,
          wristbandId: wristbandId,
          guestName: wristbandId,
          guestEmail: undefined, // Not provided in the tracking data
          signalStrength: isOffline ? 0 : signalStrength,
          lastSeen: actualLastSeen,
          location: isOffline ? "Unknown Location" : location,
          cabinNumber: isOffline ? undefined : location,
          status: isOffline ? 'inactive' : (track.Tracked ? 'active' : 'inactive'),
          alerts: isOffline 
            ? (isOfflineByTimeout ? ['Device Offline - Signal Unchanged'] : ['Device Offline']) 
            : (track.OnBoard ? [] : ['Off the vessel']),
          isOnTheMove: isOffline ? false : isOnTheMove,
          previousLocation: isOffline ? undefined : previousLocation,
          locationChangedAt: isOffline ? undefined : (isOnTheMove ? new Date().toISOString() : undefined),
          group: group, // Add group information
        }
      })
    }
    
    // If API returns a different structure, handle it here
    console.warn("⚠️ Unexpected API data structure:", apiData)
    return []
  }

  // Helper method to determine wristband group
  private getWristbandGroup(wristbandId: string): 'Family' | 'Guest' | 'Test' {
    const id = wristbandId.toUpperCase()
    
    // Family wristbands: Any starting with P or C
    if (id.startsWith('P') || id.startsWith('C')) {
      return 'Family'
    }
    
    // Guest wristbands: Any starting with G
    if (id.startsWith('G')) {
      return 'Guest'
    }
    
    // All others are Test wristbands
    return 'Test'
  }

  // Track previous locations for movement detection
  private previousLocations: Map<string, string> = new Map()
  // Track movement start times for timeout
  private movementStartTimes: Map<string, number> = new Map()

  private getPreviousLocation(wristbandId: string): string | undefined {
    return this.previousLocations.get(wristbandId)
  }

  private updatePreviousLocation(wristbandId: string, location: string): void {
    this.previousLocations.set(wristbandId, location)
  }

  private isMovementExpired(wristbandId: string): boolean {
    const startTime = this.movementStartTimes.get(wristbandId)
    if (!startTime) return false
    
    const now = Date.now()
    const elapsed = now - startTime
    const timeoutMs = 30000 // 30 seconds
    
    return elapsed > timeoutMs
  }

  private setMovementStartTime(wristbandId: string): void {
    this.movementStartTimes.set(wristbandId, Date.now())
  }

  private clearMovementStartTime(wristbandId: string): void {
    this.movementStartTimes.delete(wristbandId)
  }

  // Signal level tracking methods for timeout detection
  private updateSignalLevel(wristbandId: string, signalValue: number): void {
    const now = Date.now()
    const existing = this.signalLevels.get(wristbandId)
    
    if (!existing) {
      // First time seeing this device
      console.log(`🆕 First time tracking ${wristbandId} with signal ${signalValue}`)
      this.signalLevels.set(wristbandId, {
        value: signalValue,
        lastChanged: now,
        lastSeen: now
      })
    } else {
      // Update last seen time regardless
      existing.lastSeen = now
      
      // Check if signal level actually changed
      if (existing.value !== signalValue) {
        console.log(`📶 Signal changed for ${wristbandId}: ${existing.value} → ${signalValue}`)
        existing.value = signalValue
        existing.lastChanged = now
      } else {
        // Signal level unchanged
        const timeSinceChange = now - existing.lastChanged
        
        // Log every 30 seconds for debugging, especially for G2 507
        if (wristbandId === 'G2 507' || timeSinceChange % 30000 < 5000) { // Log roughly every 30s
          console.log(`🔄 ${wristbandId} signal unchanged: ${signalValue} for ${Math.round(timeSinceChange/1000)}s`)
        }
        
        if (timeSinceChange > 45000) { // 45 seconds - warn before 1min timeout
          console.log(`⚠️ ${wristbandId} signal unchanged for ${Math.round(timeSinceChange/1000)}s (timeout in ${60 - Math.round(timeSinceChange/1000)}s)`)
        }
      }
      
      this.signalLevels.set(wristbandId, existing)
    }
  }

  private isDeviceTimedOut(wristbandId: string): boolean {
    const signalInfo = this.signalLevels.get(wristbandId)
    if (!signalInfo) return false
    
    const now = Date.now()
    const timeSinceSignalChanged = now - signalInfo.lastChanged
    const timeoutThreshold = 1 * 60 * 1000 // 1 minute timeout as requested
    
    const isTimedOut = timeSinceSignalChanged > timeoutThreshold
    
    if (isTimedOut) {
      console.log(`⏰ Device ${wristbandId} timed out - signal hasn't changed for ${Math.round(timeSinceSignalChanged/1000)}s`)
    }
    
    return isTimedOut
  }

  private getSignalInfo(wristbandId: string): { value: number, lastChanged: number, lastSeen: number } | null {
    return this.signalLevels.get(wristbandId) || null
  }

  // Track complete API response for a device to detect truly stale data
  private updateApiResponse(wristbandId: string, track: any): boolean {
    const now = Date.now()
    const responseKey = JSON.stringify({
      Name: track.Name,
      Value: track.Value,
      Room: track.Room,
      Message: track.Message,
      LastSeen: track.LastSeen,
      Tracked: track.Tracked
    })
    
    const existing = this.rawApiResponses.get(wristbandId)
    
    if (!existing) {
      this.rawApiResponses.set(wristbandId, { response: responseKey, timestamp: now })
      console.log(`🆕 First API response for ${wristbandId}`)
      return true // First time seeing this device
    }
    
    if (existing.response !== responseKey) {
      // API response actually changed
      this.rawApiResponses.set(wristbandId, { response: responseKey, timestamp: now })
      console.log(`📡 API response changed for ${wristbandId}`)
      return true
    } else {
      // Exact same API response - this is stale data
      const timeSinceChange = now - existing.timestamp
      if (wristbandId === 'G2 507') {
        console.log(`🔒 G2 507 API response unchanged for ${Math.round(timeSinceChange/1000)}s`)
      }
      return false
    }
  }

  private isApiResponseStale(wristbandId: string): boolean {
    const apiResponse = this.rawApiResponses.get(wristbandId)
    if (!apiResponse) return false
    
    const now = Date.now()
    const timeSinceApiChanged = now - apiResponse.timestamp
    const timeoutThreshold = 1 * 60 * 1000 // 1 minute timeout
    
    const isStale = timeSinceApiChanged > timeoutThreshold
    
    if (isStale && wristbandId === 'G2 507') {
      console.log(`⏰ G2 507 API response stale - unchanged for ${Math.round(timeSinceApiChanged/1000)}s`)
    }
    
    return isStale
  }

  // Track device status changes and notify on online/offline transitions
  private updateDeviceStatus(wristbandId: string, isOffline: boolean): void {
    const now = Date.now()
    const currentStatus = this.deviceStatus.get(wristbandId)
    
    if (!currentStatus) {
      // First time seeing this device
      const newStatus = { 
        isOffline, 
        lastStatusChange: now,
        wentOfflineAt: isOffline ? now : undefined
      }
      this.deviceStatus.set(wristbandId, newStatus)
      return
    }
    
    // Check if status changed
    if (currentStatus.isOffline !== isOffline) {
      console.log(`📱 Device ${wristbandId} status changed: ${currentStatus.isOffline ? 'OFFLINE' : 'ONLINE'} → ${isOffline ? 'OFFLINE' : 'ONLINE'}`)
      
      const newStatus = { 
        isOffline, 
        lastStatusChange: now,
        wentOfflineAt: isOffline ? now : undefined
      }
      this.deviceStatus.set(wristbandId, newStatus)
      
      if (currentStatus.isOffline && !isOffline) {
        // Device came online
        console.log(`🟢 Device ${wristbandId} came online!`)
        this.onlineNotificationCallbacks.forEach(callback => {
          try {
            callback(wristbandId)
          } catch (error) {
            console.error('Error in online notification callback:', error)
          }
        })
      } else if (!currentStatus.isOffline && isOffline) {
        // Device went offline
        console.log(`🔴 Device ${wristbandId} went offline!`)
        this.offlineNotificationCallbacks.forEach(callback => {
          try {
            callback(wristbandId, now)
          } catch (error) {
            console.error('Error in offline notification callback:', error)
          }
        })
      }
    }
  }

  // Subscribe to online notifications
  subscribeToOnlineNotifications(callback: (deviceId: string) => void): () => void {
    this.onlineNotificationCallbacks.push(callback)
    return () => {
      this.onlineNotificationCallbacks = this.onlineNotificationCallbacks.filter(cb => cb !== callback)
    }
  }

  // Subscribe to offline notifications
  subscribeToOfflineNotifications(callback: (deviceId: string, offlineTime: number) => void): () => void {
    this.offlineNotificationCallbacks.push(callback)
    return () => {
      this.offlineNotificationCallbacks = this.offlineNotificationCallbacks.filter(cb => cb !== callback)
    }
  }

  private async updateData() {
    try {
      const newData = await this.fetchWristbandData()
      this.currentData = newData
      
      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback([...newData])
        } catch (error) {
          console.error("Error in listener callback:", error)
        }
      })
    } catch (error) {
      console.error("Error updating tracking data:", error)
    }
  }

  async getStats(): Promise<TrackingStats> {
    try {
      const wristbands = this.currentData
      
      const totalWristbands = wristbands.length
      const activeWristbands = wristbands.filter(wb => wb.status === 'active').length
      const onTheMoveCount = wristbands.filter(wb => wb.isOnTheMove).length
      const maintenanceCount = wristbands.filter(wb => wb.status === 'maintenance').length
      const averageSignal = wristbands.length > 0 
        ? wristbands.reduce((sum, wb) => sum + wb.signalStrength, 0) / wristbands.length 
        : 0

      return {
        totalWristbands,
        activeWristbands,
        onTheMoveCount,
        maintenanceCount,
        averageSignal: Math.round(averageSignal)
      }
    } catch (error) {
      console.error("Error getting tracking stats:", error)
      return {
        totalWristbands: 0,
        activeWristbands: 0,
        onTheMoveCount: 0,
        maintenanceCount: 0,
        averageSignal: 0
      }
    }
  }

  subscribe(callback: (data: WristbandData[]) => void) {
    this.listeners.push(callback)
    
    // Initial data fetch
    this.updateData().then(() => {
      callback([...this.currentData])
    })
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  async start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log("🟢 Real tracking system started")
    
    // Initial fetch
    await this.updateData()
    
    // Set up polling interval (every 5 seconds)
    this.intervalId = setInterval(() => {
      this.updateData()
    }, 5000)
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log("🔴 Real tracking system stopped")
  }

  async getAllWristbands(): Promise<WristbandData[]> {
    return [...this.currentData]
  }

  async getWristbandById(id: string): Promise<WristbandData | null> {
    return this.currentData.find(wb => wb.id === id) || null
  }

  // Expose online notification subscription
  onDeviceOnline(callback: (deviceId: string) => void): () => void {
    return this.subscribeToOnlineNotifications(callback)
  }

  // Expose offline notification subscription
  onDeviceOffline(callback: (deviceId: string, offlineTime: number) => void): () => void {
    return this.subscribeToOfflineNotifications(callback)
  }

  // Get when a device went offline
  getDeviceOfflineTime(deviceId: string): number | null {
    const status = this.deviceStatus.get(deviceId)
    return status?.wentOfflineAt || null
  }
}

// Global instance
const trackingSystem = new RealTrackingSystem()

export function useLiveWristbands() {
  const [wristbands, setWristbands] = useState<WristbandData[]>([])
  const [stats, setStats] = useState<TrackingStats>({
    totalWristbands: 0,
    activeWristbands: 0,
    onTheMoveCount: 0,
    maintenanceCount: 0,
    averageSignal: 0
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    
    try {
      setIsConnected(true)

      unsubscribe = trackingSystem.subscribe((data) => {
        try {
          setWristbands(data)
        } catch (error) {
          console.error("Error updating wristband data:", error)
        }
      })

      // Start tracking
      trackingSystem.start()
    } catch (error) {
      console.error("Error setting up tracking subscription:", error)
      setIsConnected(false)
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error("Error during cleanup:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    const updateStats = async () => {
      const newStats = await trackingSystem.getStats()
      setStats(newStats)
    }
    updateStats()
  }, [wristbands])

  const refreshData = useCallback(async () => {
    const data = await trackingSystem.getAllWristbands()
    setWristbands(data)
  }, [])

  return { 
    wristbands, 
    stats, 
    isConnected, 
    refreshData, 
    onDeviceOnline: trackingSystem.onDeviceOnline.bind(trackingSystem),
    onDeviceOffline: trackingSystem.onDeviceOffline.bind(trackingSystem),
    getDeviceOfflineTime: trackingSystem.getDeviceOfflineTime.bind(trackingSystem)
  }
}

export async function getWristbandData(): Promise<WristbandData[]> {
  return await trackingSystem.getAllWristbands()
}

export async function getTrackingStats(): Promise<TrackingStats> {
  return await trackingSystem.getStats()
}

export async function fetchTrackingData() {
  try {
    const [wristbands, stats] = await Promise.all([
      getWristbandData(),
      getTrackingStats()
    ])
    
    return { wristbands, stats }
  } catch (error) {
    console.error("Error fetching tracking data:", error)
    return { 
      wristbands: [], 
      stats: { 
        totalWristbands: 0, 
        activeWristbands: 0, 
        onTheMoveCount: 0, 
        maintenanceCount: 0, 
        averageSignal: 0 
      } 
    }
  }
}
