"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase-client"

// Real tracking API endpoint
const TRACKING_API_ENDPOINT = "http://myyachtservices.itwservices.local:8020"

// Simplified wristband data - only location and signal strength
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
  isOnTheMove: boolean // New field for movement detection
  previousLocation?: string
  locationChangedAt?: string
}

export interface TrackingStats {
  totalWristbands: number
  activeWristbands: number
  onTheMoveCount: number
  maintenanceCount: number
  averageSignal: number
}

// Yacht locations for realistic movement simulation (COMMENTED OUT - Using real API now)
/*
const YACHT_LOCATIONS = [
  "Master Suite (602)",
  "DUBAI Cabin (503)",
  "NEW YORK Cabin (504)",
  "SYDNEY Cabin (502)",
  "ROME Cabin (507)",
  "PARIS Cabin (506)",
  "TOKYO Cabin (510)",
  "BEIJING Cabin (403)",
  "ISTANBUL Cabin (404)",
  "MADRID Cabin (407)",
  "CAIRO Cabin (408)",
  "MONACO Cabin (409)",
  "HOLLYWOOD Cabin (410)",
  "RIO Cabin (411)",
  "LONDON Cabin (412)",
  "VENICE Cabin (413)",
  "MYKONOS Cabin (414)",
  "CAPRI Cabin (418)",
  "Upper Deck Pool",
  "Spa Deck",
  "Main Deck Dining",
  "Lower Deck Lounge",
  "Sun Deck",
  "Game Room",
  "Gym",
  "Library",
  "Bar Area",
  "Observation Deck",
]
*/

// COMMENTED OUT - Using real API now
/*
class SimulatedTrackingSystem {
  private wristbands: WristbandData[] = []
  private listeners: ((data: WristbandData[]) => void)[] = []
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.initializeWristbands()
  }
*/

  private initializeWristbands() {
    // COMMENTED OUT - Using real API now
    /*
    this.wristbands = [
      {
        id: "wb_001",
        wristbandId: "P1",
        guestName: "Mr. Owner",
        guestEmail: "mr.owner@yacht.com",
        signalStrength: 92,
        lastSeen: new Date().toISOString(),
        location: "Master Suite (602)",
        cabinNumber: "602",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
      {
        id: "wb_002",
        wristbandId: "P2",
        guestName: "Mrs. Owner",
        guestEmail: "mrs.owner@yacht.com",
        signalStrength: 89,
        lastSeen: new Date().toISOString(),
        location: "Spa Deck",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
      {
        id: "wb_003",
        wristbandId: "G1-503",
        guestName: "John Smith",
        guestEmail: "john.smith@example.com",
        signalStrength: 85,
        lastSeen: new Date().toISOString(),
        location: "DUBAI Cabin (503)",
        cabinNumber: "503",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
      {
        id: "wb_004",
        wristbandId: "G1-506",
        guestName: "Sarah Johnson",
        guestEmail: "sarah.johnson@example.com",
        signalStrength: 78,
        lastSeen: new Date().toISOString(),
        location: "PARIS Cabin (506)",
        cabinNumber: "506",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
      {
        id: "wb_005",
        wristbandId: "G1-507",
        guestName: "Michael Brown",
        guestEmail: "michael.brown@example.com",
        signalStrength: 91,
        lastSeen: new Date().toISOString(),
        location: "Upper Deck Pool",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
      {
        id: "wb_006",
        wristbandId: "G1-508",
        guestName: "Emily Davis",
        guestEmail: "emily.davis@example.com",
        signalStrength: 45,
        lastSeen: new Date().toISOString(),
        location: "LONDON Cabin (412)",
        cabinNumber: "412",
        status: "maintenance",
        alerts: ["Weak Signal"],
        isOnTheMove: false,
      },
      {
        id: "wb_007",
        wristbandId: "F1",
        guestName: "Owner Child 1",
        guestEmail: "child1@yacht.com",
        signalStrength: 88,
        lastSeen: new Date().toISOString(),
        location: "Game Room",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
      {
        id: "wb_008",
        wristbandId: "F2",
        guestName: "Owner Child 2",
        guestEmail: "child2@yacht.com",
        signalStrength: 86,
        lastSeen: new Date().toISOString(),
        location: "Upper Deck",
        status: "active",
        alerts: [],
        isOnTheMove: false,
      },
    ]
    */
  }

  private simulateRealTimeUpdates() {
    this.wristbands = this.wristbands.map((wb) => {
      const previousLocation = wb.location

      // Simulate signal fluctuation
      wb.signalStrength = Math.max(20, Math.min(100, wb.signalStrength + (Math.random() - 0.5) * 8))

      // Update last seen
      wb.lastSeen = new Date().toISOString()

      // Simulate location changes (10% chance per update)
      if (Math.random() > 0.9) {
        const newLocation = YACHT_LOCATIONS[Math.floor(Math.random() * YACHT_LOCATIONS.length)]

        if (newLocation !== wb.location) {
          wb.previousLocation = wb.location
          wb.location = newLocation
          wb.isOnTheMove = true
          wb.locationChangedAt = new Date().toISOString()

          // Extract cabin number if it's a cabin location
          const cabinMatch = newLocation.match(/$$(\d+)$$/)
          wb.cabinNumber = cabinMatch ? cabinMatch[1] : undefined
        }
      } else if (wb.isOnTheMove) {
        // Stop showing "on the move" after 30 seconds
        const changeTime = wb.locationChangedAt ? new Date(wb.locationChangedAt).getTime() : 0
        const now = new Date().getTime()
        if (now - changeTime > 30000) {
          // 30 seconds
          wb.isOnTheMove = false
        }
      }

      // Update status based on signal strength
      if (wb.signalStrength < 30) {
        wb.status = "maintenance"
        wb.alerts = ["Weak Signal"]
      } else {
        wb.status = "active"
        wb.alerts = []
      }

      return wb
    })

    // Notify all listeners safely
    this.listeners.forEach((callback) => {
      try {
        callback([...this.wristbands])
      } catch (error) {
        console.error("Error in listener callback:", error)
      }
    })
  }

  subscribe(callback: (data: WristbandData[]) => void) {
    this.listeners.push(callback)

    // Start simulation if not already running
    if (!this.isRunning) {
      this.start()
    }

    // Send initial data safely
    try {
      callback([...this.wristbands])
    } catch (error) {
      console.error("Error in tracking subscription callback:", error)
    }

    // Return unsubscribe function
    return () => {
      try {
        this.listeners = this.listeners.filter((listener) => listener !== callback)
        if (this.listeners.length === 0) {
          this.stop()
        }
      } catch (error) {
        console.error("Error during unsubscribe:", error)
      }
    }
  }

  private start() {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(() => {
      try {
        this.simulateRealTimeUpdates()
      } catch (error) {
        console.error("Error in real-time update simulation:", error)
      }
    }, 3000) // Update every 3 seconds
  }

  private stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  getStats(): TrackingStats {
    const active = this.wristbands.filter((wb) => wb.status === "active")
    const maintenance = this.wristbands.filter((wb) => wb.status === "maintenance")
    const onTheMove = this.wristbands.filter((wb) => wb.isOnTheMove)

    const avgSignal = this.wristbands.reduce((sum, wb) => sum + wb.signalStrength, 0) / this.wristbands.length

    return {
      totalWristbands: this.wristbands.length,
      activeWristbands: active.length,
      onTheMoveCount: onTheMove.length,
      maintenanceCount: maintenance.length,
      averageSignal: Math.round(avgSignal),
    }
  }

  getAllWristbands(): WristbandData[] {
    return [...this.wristbands]
  }

  getWristbandById(id: string): WristbandData | null {
    return this.wristbands.find((wb) => wb.id === id) || null
  }
}

// Global instance
export const trackingSystem = new SimulatedTrackingSystem()

// React hook for live wristband data
export function useLiveWristbands() {
  const [wristbands, setWristbands] = useState<WristbandData[]>([])
  const [stats, setStats] = useState<TrackingStats | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    
    try {
      setIsConnected(true)

      unsubscribe = trackingSystem.subscribe((data) => {
        try {
          setWristbands(data)
          setStats(trackingSystem.getStats())
        } catch (error) {
          console.error("Error updating wristband data:", error)
        }
      })
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

  const refreshData = useCallback(() => {
    setWristbands(trackingSystem.getAllWristbands())
    setStats(trackingSystem.getStats())
  }, [])

  return {
    wristbands,
    stats,
    isConnected,
    refreshData,
  }
}

// Legacy functions for backward compatibility
export async function getWristbandData(): Promise<WristbandData[]> {
  return trackingSystem.getAllWristbands()
}

export async function getTrackingStats() {
  const stats = trackingSystem.getStats()
  const topLocations = [
    { location: "Upper Deck Pool", count: 2 },
    { location: "Spa Deck", count: 1 },
    { location: "Game Room", count: 1 },
  ]

  return {
    ...stats,
    topLocations,
    lastUpdated: new Date(),
  }
}

export async function fetchTrackingData() {
  return trackingSystem.getAllWristbands().map((wb) => ({
    id: wb.id,
    guestId: wb.id,
    guestName: wb.guestName,
    location: wb.location,
    signalStrength: wb.signalStrength,
    lastSeen: wb.lastSeen,
    isMoving: wb.isOnTheMove,
  }))
}

// Add function to get wristband data with guest linking from database
export async function getWristbandDataWithGuests(): Promise<WristbandData[]> {
  try {
    // Fetch wristbands with linked guest information
    const { data: wristbandsData, error: wristbandsError } = await supabase
      .from('wristbands')
      .select(`
        *,
        guest:guests(*)
      `)
      .order('wristband_id')

    if (wristbandsError) {
      console.error('Error fetching wristbands:', wristbandsError)
      return []
    }

    // Transform the data to match WristbandData interface
    const wristbands: WristbandData[] = wristbandsData?.map((wb: any) => ({
      id: wb.id.toString(),
      wristbandId: wb.wristband_id,
      guestName: wb.guest?.name || 'Unknown Guest',
      guestEmail: wb.guest?.email || '',
      signalStrength: wb.signal_strength || 0,
      lastSeen: wb.last_seen || new Date().toISOString(),
      location: wb.last_location || 'Unknown Location',
      cabinNumber: wb.guest?.cabin_id || '',
      status: wb.status as "active" | "inactive" | "maintenance",
      alerts: [],
      isOnTheMove: false,
      previousLocation: undefined,
      locationChangedAt: undefined,
    })) || []

    return wristbands
  } catch (error) {
    console.error('Error in getWristbandDataWithGuests:', error)
    return []
  }
}
