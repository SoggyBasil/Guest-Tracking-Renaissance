"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { fetchTraceITServiceCalls, groupByWristband, type TraceITServiceItem } from "@/lib/traceit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Search, Zap, Phone, User, ArrowLeft, MapPin } from "lucide-react"
import Link from "next/link"
import { safeFormatDate, convertCustomDateToISO } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"
import { GuestProfilePopup } from "@/components/guest-profile-popup"
import { NavigationMenu } from "@/components/ui/navigation-menu"

// Cabin details popup component
const CabinDetailsPopup = ({ 
  cabinNumber, 
  cabinName, 
  guests, 
  isOpen, 
  onClose 
}: { 
  cabinNumber: string
  cabinName: string
  guests: any[]
  isOpen: boolean
  onClose: () => void 
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-400" />
              Cabin Details
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Cabin Information */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Cabin Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Cabin Number:</span>
                  <span className="text-white font-medium">G{cabinNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Cabin Name:</span>
                  <span className="text-white font-medium">{cabinName}</span>
                </div>
              </div>
            </div>

            {/* Assigned Guests */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned Guests
              </h3>
              {guests.length > 0 ? (
                <div className="space-y-3">
                  {guests.map((guest, index) => (
                    <div key={index} className="bg-slate-600/50 rounded p-3">
                      <div className="font-medium text-white">{guest.name}</div>
                      {guest.email && (
                        <div className="text-sm text-slate-300">{guest.email}</div>
                      )}
                      {guest.phone && (
                        <div className="text-sm text-slate-300">{guest.phone}</div>
                      )}
                      {guest.guest_type && (
                        <div className="text-xs text-orange-400 mt-1">{guest.guest_type}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-center py-4">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No guests currently assigned to this cabin</p>
                </div>
              )}
            </div>

            {/* Call Information */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call Information
              </h3>
              <div className="text-slate-300 text-sm">
                <p>This service call was made from a cabin device (G{cabinNumber}), not a guest wristband.</p>
                <p className="mt-2">Cabin devices are typically used for general service requests from the cabin location.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced service call interface with status and acknowledgment
interface EnhancedServiceCall extends TraceITServiceItem {
  status: 'sentToRadios' | 'accepted' | 'expired'
  ackBy?: string
  ackTime?: string
  timestamp: string
  // Removed priority field
}

export default function ServiceCallsPage() {
  const [items, setItems] = useState<EnhancedServiceCall[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastDataHash, setLastDataHash] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPollTimeRef = useRef<number>(0)
  const [callStatusMap, setCallStatusMap] = useState<Map<number, { status: string, ackBy?: string, ackTime?: string }>>(new Map())
  const [allGuests, setAllGuests] = useState<any[]>([])
  const [allCabins, setAllCabins] = useState<any[]>([])
  const [guestAssignments, setGuestAssignments] = useState<any[]>([])
  const [selectedGuest, setSelectedGuest] = useState<any>(null)
  const [showGuestProfile, setShowGuestProfile] = useState(false)
  const [showCabinDetails, setShowCabinDetails] = useState(false)
  const [cabinNumberToShow, setCabinNumberToShow] = useState<string | null>(null)
  const [cabinNameToShow, setCabinNameToShow] = useState<string | null>(null)
  const [guestsForCabinDetails, setGuestsForCabinDetails] = useState<any[]>([])

  // Create a simple hash of the data to detect changes
  const createDataHash = (calls: TraceITServiceItem[]): string => {
    return calls.map(call => `${call.id}-${call.text}-${call.wristbands.join(',')}-${call.status || ''}-${call.ackBy || ''}-${call.ackTime || ''}`).join('|')
  }

  // Load guest and cabin data
  const loadGuestData = async () => {
    try {
      const [guestsData, cabinsData, wristbandsData] = await Promise.all([
        supabase.from("guests").select("*").order("created_at", { ascending: false }),
        supabase.from("yacht_cabins").select("*"),
        supabase.from("wristbands").select("*"),
      ])
      setAllGuests(guestsData.data || [])
      setAllCabins(cabinsData.data || [])
      setGuestAssignments(wristbandsData.data || [])
    } catch (error) {
      console.error("Error loading guest data:", error)
    }
  }

  // Get cabin name from cabin number
  const getCabinName = (cabinNumber: string): string => {
    const cabin = allCabins.find(c => c.cabin_number === cabinNumber)
    return cabin ? cabin.cabin_name : cabinNumber
  }

  // Extract cabin number from service call text
  const extractCabinFromCall = (callText: string): string | null => {
    // Look for patterns like "GUEST CALL from G505" or "SERVICE CALL from G414"
    const match = callText.match(/from\s+G(\d{3})/i)
    return match ? match[1] : null
  }

  // Check if a call is from a cabin device (G + 3 digits)
  const isCabinCall = (callText: string): boolean => {
    return /G\d{3}/i.test(callText)
  }

  // Get guest information for a wristband
  const getGuestForWristband = (wristbandId: string) => {
    // Find the wristband in Supabase database
    const supabaseWristband = guestAssignments.find((wb: any) => wb.wristband_id === wristbandId)
    
    let guest: any = null
    let cabin: any = null
    
    if (supabaseWristband && supabaseWristband.guest_id) {
      // Find the guest using the guest_id from wristband
      guest = allGuests.find((g: any) => g.id === supabaseWristband.guest_id)
      
      if (guest) {
        // Find the cabin assigned to this guest
        cabin = allCabins.find((c: any) => c.guest_id_1 === guest.id || c.guest_id_2 === guest.id)
      }
    }
    
    // If no guest found through wristband, try to find by name as fallback
    if (!guest) {
      guest = allGuests.find((g: any) => g.name.toLowerCase().includes(wristbandId.toLowerCase()))
      
      if (guest) {
        cabin = allCabins.find((c: any) => c.guest_id_1 === guest.id || c.guest_id_2 === guest.id)
      }
    }
    
    return { guest, cabin }
  }

     // Handle service call click to show guest information
   const handleServiceCallClick = (call: EnhancedServiceCall) => {
     // Only handle wristband calls - cabin calls should not have wristbands
     const isCabinDeviceCall = isCabinCall(call.text)
     if (!isCabinDeviceCall && call.wristbands && call.wristbands.length > 0) {
      const wristbandId = call.wristbands[0]
      const { guest, cabin } = getGuestForWristband(wristbandId)
      
      if (guest) {
        // Transform data to match guest profile interface
        const transformedGuest = {
          name: guest.name,
          email: guest.email || '',
          phone: guest.phone || '',
          guest_type: guest.guest_type || 'Guest',
          allergies: guest.allergies || '',
          special_requests: guest.special_requests || '',
          profile_photo: guest.photo_url || guest.profile_photo || '',
        }
        
        const transformedWristband = {
          wristband_id: wristbandId,
          location: cabin ? `${cabin.cabin_number} - ${cabin.cabin_name}` : 'Unknown Location',
          previousLocation: '',
          signalStrength: 0,
          isOnTheMove: false,
          cabin: cabin ? `${cabin.cabin_number} - ${cabin.cabin_name}` : 'Unknown Location',
        }
        
        setSelectedGuest({ guest: transformedGuest, wristband: transformedWristband })
        setShowGuestProfile(true)
      }
    }
  }

     // Handle cabin call click to show cabin information
   const handleCabinCallClick = (cabinNumber: string, cabinName: string) => {
     setCabinNumberToShow(cabinNumber)
     setCabinNameToShow(cabinName)
     
     // Find guests assigned to this cabin
     const guestsAssignedToCabin = allGuests.filter((g: any) => {
       // Check if guest is assigned to this cabin through cabin assignments
       const cabinAssignment = allCabins.find((c: any) => 
         c.cabin_number === cabinNumber && 
         (c.guest_id_1 === g.id || c.guest_id_2 === g.id)
       )
       return cabinAssignment !== undefined
     })
     
     setGuestsForCabinDetails(guestsAssignedToCabin)
     setShowCabinDetails(true)
   }

  const load = async (forceRefresh = false) => {
    const now = Date.now()
    
    // Prevent too frequent requests (minimum 10 seconds between requests)
    if (!forceRefresh && (now - lastPollTimeRef.current) < 10000) {
      return
    }

    setLoading(true)
    setError(null)
    lastPollTimeRef.current = now
    
    try {
      // Pull directly from the alarm URL
      const res = await fetchTraceITServiceCalls({ url: "http://10.101.12.31/alarm.xml" })
      const list = res.items || []
      
      // Create hash of new data
      const newDataHash = createDataHash(list)
      
      // Only process if data has changed or forced refresh
      if (forceRefresh || newDataHash !== lastDataHash) {
        console.log('🔄 Service calls data changed, processing updates...')
        
        // Filter calls from last 30 minutes and sort by ID (newest first)
        const thirtyMinutesAgo = now - (30 * 60 * 1000)
        const recentCalls = list
          .filter(call => {
            // For now, show all calls. In real implementation, filter by actual timestamp
            return true
          })
          .sort((a, b) => b.id - a.id) // Sort by ID descending (newest first)
        
        // Transform to enhanced service calls with proper status handling
        const enhancedList: EnhancedServiceCall[] = recentCalls.map((item) => {
          const now = Date.now()
          
          // Check if we have existing status for this call
          const existingStatus = callStatusMap.get(item.id)
          
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
            if (item.status) {
              const apiStatus = item.status.toLowerCase()
              if (apiStatus === 'expired' || apiStatus === 'accepted' || apiStatus === 'acknowledged') {
                status = 'accepted' // Treat expired and acknowledged as accepted
              } else if (apiStatus === 'sent' || apiStatus === 'active' || apiStatus === 'pending') {
                status = 'sentToRadios'
              }
              
              // Use actual acknowledgment data if available
              if (item.ackBy) {
                ackBy = item.ackBy
              }
              if (item.ackTime) {
                ackTime = item.ackTime
              } else if (item.timestamp) {
                // Use timestamp as acknowledgment time if no specific ack time
                ackTime = item.timestamp
              }
            } else {
              // Fallback to simulation only if no status from API
              if (item.id % 3 === 0) {
                status = 'expired' // Treat as accepted
                const radioIds = ['734:Interior 6', '735:Deck 7', '736:Engine Room', '737:Galley', '738:Housekeeping']
                const ackRadio = radioIds[item.id % radioIds.length]
                ackBy = ackRadio.split(':')[1]
                // Fix: Use a hash-based time offset for string IDs
                const timeOffset = (item.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 60) * 1000
                ackTime = new Date(now - timeOffset).toISOString()
              } else if (item.id % 3 === 1) {
                status = 'accepted'
                const radioIds = ['734:Interior 6', '735:Deck 7', '736:Engine Room', '737:Galley', '738:Housekeeping']
                const ackRadio = radioIds[item.id % radioIds.length]
                ackBy = ackRadio.split(':')[1]
                // Fix: Use a hash-based time offset for string IDs
                const timeOffset = (item.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 60) * 1000
                ackTime = new Date(now - timeOffset).toISOString()
              }
            }
            
            // Store the status to prevent changes
            setCallStatusMap(prev => new Map(prev).set(item.id, { status, ackBy, ackTime }))
          }
          
          return {
            ...item,
            status,
            ackBy,
            ackTime,
                         timestamp: (item.timestamp ? convertCustomDateToISO(item.timestamp) : null) || item.timestamp || new Date(now - ((item.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 60) * 1000)).toISOString(), // Convert custom format or use API timestamp or hash-based fallback
          }
        })
      
        setItems(enhancedList)
        setLastDataHash(newDataHash)
        setLastRefresh(new Date())
        setIsConnected(true)
      } else {
        console.log('📊 No service calls data changes detected')
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load service calls")
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Initialize lastRefresh on client side only to prevent hydration mismatch
  useEffect(() => {
    if (!lastRefresh) {
      setLastRefresh(new Date())
    }
  }, [lastRefresh])

  useEffect(() => {
    load(true) // Initial load
    loadGuestData() // Load guest and cabin data
    let interval: NodeJS.Timeout | null = null
    
    if (autoRefresh) {
      interval = setInterval(() => load(), 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => 
      it.text.toLowerCase().includes(q) ||
      it.wristbands.some(wb => wb.toLowerCase().includes(q)) ||
      (it.ackBy && it.ackBy.toLowerCase().includes(q))
    )
  }, [items, search])

  const grouped = useMemo(() => groupByWristband(filtered), [filtered])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sentToRadios':
        return 'bg-red-500 text-white'
      case 'accepted':
      case 'expired':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sentToRadios':
        return <AlertTriangle className="h-4 w-4" />
      case 'accepted':
      case 'expired':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sentToRadios':
        return 'SENT TO RADIOS'
      case 'accepted':
        return 'ACCEPTED'
      case 'expired':
        return 'ACCEPTED' // Show as accepted even though it's expired
      default:
        return status.toUpperCase()
    }
  }

  const formatTime = (timestamp: string) => {
    return safeFormatDate(timestamp)
  }

  const formatAckTime = (ackTime: string) => {
    return safeFormatDate(ackTime)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              🚨 Service Calls
            </h1>
            <p className="text-slate-400 mt-2">Real-time service call monitoring and management</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              <span className={isConnected ? "text-green-400" : "text-red-400"}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${autoRefresh ? "bg-blue-400 animate-pulse" : "bg-gray-400"}`} />
              <span className={autoRefresh ? "text-blue-400" : "text-gray-400"}>
                {autoRefresh ? "Auto Refresh Active" : "Manual Mode"}
              </span>
            </div>
                         <Badge variant="outline" className="border-blue-400 text-blue-400">
               Last Update: {lastRefresh ? lastRefresh.toLocaleTimeString('en-US', { 
                 hour12: false,
                 hour: '2-digit',
                 minute: '2-digit',
                 second: '2-digit'
               }) : '--:--:--'}
             </Badge>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="outline"
              size="sm"
              className="border-blue-400 text-blue-400 bg-transparent"
            >
              <Zap className="h-4 w-4 mr-2" />
              {autoRefresh ? "Disable Auto" : "Enable Auto"}
            </Button>
            <Button onClick={() => load(true)} variant="outline" className="border-red-500 text-red-400 bg-transparent">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <NavigationMenu showBackButton={true} backButtonText="Back to Dashboard" backButtonHref="/" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search service calls, wristbands, or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-400"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {filtered.filter(call => call.status === 'sentToRadios').length}
                  </p>
                  <p className="text-slate-400 text-sm">Sent to Radios</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {filtered.filter(call => call.status === 'accepted' || call.status === 'expired').length}
                  </p>
                  <p className="text-slate-400 text-sm">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Phone className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{grouped.size}</p>
                  <p className="text-slate-400 text-sm">Wristbands</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-900/20 border-red-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Service Calls List */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-red-400" />
              Service Calls
              <Badge variant="outline" className="border-red-400 text-red-400">
                {filtered.length} total
              </Badge>
              {loading && <span className="text-slate-400">Loading...</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No service calls found</p>
                </div>
              ) : (
                                 filtered.map((call, index) => {
                   // Check if this is a cabin call first (priority over wristband detection)
                   const isCabinDeviceCall = isCabinCall(call.text)
                   const cabinNumber = extractCabinFromCall(call.text)
                   const cabinName = cabinNumber ? getCabinName(cabinNumber) : null
                   
                   // Only consider it a wristband call if it's NOT a cabin call AND has wristbands
                   const isWristbandCall = !isCabinDeviceCall && call.wristbands && call.wristbands.length > 0
                  
                  return (
                    <div
                      key={`${call.id}-${index}`}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        call.status === 'accepted' || call.status === 'expired'
                          ? 'bg-green-900/20 border-green-500/50'
                          : 'bg-red-900/20 border-red-500/50 hover:bg-red-900/30'
                      } ${(isWristbandCall || isCabinDeviceCall) ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isWristbandCall) {
                          handleServiceCallClick(call)
                        } else if (isCabinDeviceCall && cabinNumber) {
                          handleCabinCallClick(cabinNumber, cabinName || `G${cabinNumber}`)
                        }
                      }}
                    >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(call.status)}>
                          {getStatusIcon(call.status)}
                          <span className="ml-1">{getStatusText(call.status)}</span>
                        </Badge>
                        <span className="text-slate-400 text-sm">
                          {formatTime(call.timestamp)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">
                          Call #{call.id}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-white font-medium">{call.text}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isWristbandCall ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-slate-300">
                              Wristbands: {call.wristbands.join(', ')}
                            </span>
                            <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">
                              Click to view guest
                            </Badge>
                          </div>
                        ) : isCabinDeviceCall && cabinName ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-orange-400" />
                            <span className="text-sm text-slate-300">
                              Cabin: {cabinName}
                            </span>
                            <Badge variant="outline" className="border-orange-400 text-orange-400 text-xs">
                              Click to view cabin
                            </Badge>
                          </div>
                        ) : isCabinDeviceCall ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-orange-400" />
                            <span className="text-sm text-slate-300">
                              Cabin Device: G{cabinNumber}
                            </span>
                            <Badge variant="outline" className="border-orange-400 text-orange-400 text-xs">
                              Click to view cabin
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-slate-400">
                              Location: Unknown
                            </span>
                          </div>
                        )}
                      </div>

                      {(call.status === 'accepted' || call.status === 'expired') && call.ackBy && call.ackTime && (
                        <div className="text-right">
                          <div className="text-sm text-green-400 font-medium">
                            Accepted by {call.ackBy}
                          </div>
                          <div className="text-xs text-slate-400">
                            at {formatAckTime(call.ackTime)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            </div>
          </CardContent>
        </Card>

        {/* Wristband Summary */}
        {grouped.size > 0 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="h-6 w-6 text-blue-400" />
                Wristband Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...grouped.entries()].map(([wid, calls]) => (
                  <div key={wid} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-400">{wid}</span>
                      <Badge variant="outline" className="border-blue-400 text-blue-400">
                        {calls.length} call{calls.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {calls.slice(0, 3).map((call, index) => (
                        <div key={index} className="text-sm text-slate-300 truncate">
                          {call.text}
                        </div>
                      ))}
                      {calls.length > 3 && (
                        <div className="text-xs text-slate-500">
                          +{calls.length - 3} more calls
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest Profile Popup */}
        <GuestProfilePopup
          guest={selectedGuest?.guest || null}
          wristband={selectedGuest?.wristband || null}
          isOpen={showGuestProfile}
          onClose={() => {
            setShowGuestProfile(false)
            setSelectedGuest(null)
          }}
        />

        {/* Cabin Details Popup */}
        <CabinDetailsPopup
          cabinNumber={cabinNumberToShow || ''}
          cabinName={cabinNameToShow || ''}
          guests={guestsForCabinDetails}
          isOpen={showCabinDetails}
          onClose={() => setShowCabinDetails(false)}
        />
      </div>
    </div>
  )
}


