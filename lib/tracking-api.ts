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

// React hook for live wristband data
export function useLiveWristbands() {
  const [wristbands, setWristbands] = useState<WristbandData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch from real API
      const response = await fetch(`${TRACKING_API_ENDPOINT}/api/tracking/wristbands`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setWristbands(data)
    } catch (err) {
      console.error("Error fetching wristband data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      
      // Fallback to empty array
      setWristbands([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Set up polling every 5 seconds
    const interval = setInterval(fetchData, 5000)

    return () => clearInterval(interval)
  }, [fetchData])

  return { wristbands, loading, error, refetch: fetchData }
}

// API functions for fetching wristband data
export async function getWristbandData(): Promise<WristbandData[]> {
  const response = await fetch(`${TRACKING_API_ENDPOINT}/api/tracking/wristbands`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}

export async function getTrackingStats() {
  const response = await fetch(`${TRACKING_API_ENDPOINT}/api/tracking/stats`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}

// Fetch tracking data with error handling
export async function fetchTrackingData() {
  try {
    const [wristbands, stats] = await Promise.all([
      getWristbandData(),
      getTrackingStats()
    ])
    
    return { wristbands, stats }
  } catch (error) {
    console.error("Error fetching tracking data:", error)
    throw error
  }
}

// Enhanced function to get wristband data with guest information
export async function getWristbandDataWithGuests(): Promise<WristbandData[]> {
  try {
    // First, get wristband data from the tracking API
    const wristbands = await getWristbandData()
    
    // Then, get guest data from Supabase to enrich the wristband data
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('*')
    
    if (guestError) {
      console.error("Error fetching guests:", guestError)
      return wristbands // Return wristbands without guest enrichment
    }
    
    // Create a map of wristband ID to guest data for quick lookup
    const guestMap = new Map()
    guests?.forEach(guest => {
      if (guest.wristband_id) {
        guestMap.set(guest.wristband_id, guest)
      }
    })
    
    // Enrich wristband data with guest information
    const enrichedWristbands = wristbands.map(wristband => {
      const guest = guestMap.get(wristband.wristbandId)
      return {
        ...wristband,
        guestEmail: guest?.email || wristband.guestEmail,
        // Add any other guest fields you want to include
      }
    })
    
    return enrichedWristbands
  } catch (error) {
    console.error("Error in getWristbandDataWithGuests:", error)
    // Fallback to basic wristband data
    return getWristbandData()
  }
}
