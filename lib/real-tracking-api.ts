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
    
    if (apiData && apiData.Tracks && Array.isArray(apiData.Tracks)) {
      return apiData.Tracks.map((track: any) => {
        const wristbandId = track.Name || 'Unknown'
        const location = track.Room || track.Message || 'Unknown Location'
        const signalStrength = track.Value || 0
        
        // Determine wristband group
        const group = this.getWristbandGroup(wristbandId)
        
        // Check if offline (signal 0 or location UNKNOWN)
        const isOffline = signalStrength === 0 || location.toLowerCase().includes('unknown')
        
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
        
        return {
          id: wristbandId,
          wristbandId: wristbandId,
          guestName: wristbandId,
          guestEmail: undefined, // Not provided in the tracking data
          signalStrength: signalStrength,
          lastSeen: new Date().toISOString(), // Not provided, using current time
          location: location,
          cabinNumber: location,
          status: isOffline ? 'inactive' : (track.Tracked ? 'active' : 'inactive'),
          alerts: isOffline ? ['Offline'] : (track.OnBoard ? [] : ['Off the vessel']),
          isOnTheMove: isOnTheMove,
          previousLocation: previousLocation,
          locationChangedAt: isOnTheMove ? new Date().toISOString() : undefined,
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

  return { wristbands, stats, isConnected, refreshData }
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
