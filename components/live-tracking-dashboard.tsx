"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
// import { useLiveWristbands } from "@/lib/tracking-api" // COMMENTED OUT - Using real API now
import { useLiveWristbands } from "@/lib/real-tracking-api"
import { supabase } from "@/lib/supabase-client"
import { Signal, MapPin, AlertTriangle, RefreshCw, Search, Navigation, Zap, Bug, ChevronDown, ChevronRight } from "lucide-react"
import { GuestProfilePopup } from "./guest-profile-popup"
import { testApiConnection, testCors } from "@/lib/api-test"

export function LiveTrackingDashboard() {
  const { wristbands, stats: trackingStats, isConnected, refreshData } = useLiveWristbands()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<'all' | 'family' | 'guest' | 'test'>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectedWristband, setSelectedWristband] = useState<{
    guest: any;
    wristband: any;
  } | null>(null)
  const [showGuestProfile, setShowGuestProfile] = useState(false)
  const [allGuests, setAllGuests] = useState<any[]>([])
  const [allCabins, setAllCabins] = useState<any[]>([])
  const [guestAssignments, setGuestAssignments] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadData()
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [guestsData, cabinsData, wristbandsData] = await Promise.all([
        supabase.from("guests").select("*").order("created_at", { ascending: false }),
        supabase.from("yacht_cabins").select("*"),
        supabase.from("wristbands").select("*").order("wristband_id"),
      ])
      setAllGuests(guestsData.data || [])
      setAllCabins(cabinsData.data || [])
      setGuestAssignments(wristbandsData.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWristbands = wristbands.filter((wb) => {
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'family' && wb.group === 'Family') ||
      (activeFilter === 'guest' && wb.group === 'Guest') ||
      (activeFilter === 'test' && wb.group === 'Test')
    
    const matchesSearch = searchTerm === "" || 
      wb.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wb.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wb.wristbandId.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "maintenance":
        return "bg-red-500"
      case "inactive":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getSignalColor = (strength: number, location?: string) => {
    // BLE-friendly signal quality logic
    // -59 and above = Strong (Green)
    // -69 to -58 = Good (Yellow)
    // -79 to -68 = Fair (Orange)
    // Below -79 = Poor (Red)
    // Offline (0 dB or unknown location) = Gray
    if (strength === 0 || !location || location.toLowerCase().includes('unknown')) return "text-gray-400"
    if (strength >= -59) return "text-green-600"
    if (strength >= -69) return "text-yellow-600"
    if (strength >= -79) return "text-orange-600"
    return "text-red-600"
  }

  const getDisplayLocation = (wristband: any) => {
    return wristband.cabinNumber ? wristband.location : "Unassigned"
  }

  const alertWristbands = wristbands.filter((wb) => wb.alerts.length > 0)
  const movingWristbands = wristbands.filter((wb) => wb.isOnTheMove)
  
  // Filter out offline devices first - using the same logic as the API
  const onlineWristbands = wristbands.filter((wb) => 
    !(wb.signalStrength === 0 || wb.location.toLowerCase().includes('unknown'))
  )
  const offlineWristbands = wristbands.filter((wb) => 
    wb.signalStrength === 0 || wb.location.toLowerCase().includes('unknown')
  )
  
  // Debug logging for offline detection
  console.log('🔍 Offline detection debug:', {
    totalWristbands: wristbands.length,
    offlineWristbands: offlineWristbands.length,
    offlineDetails: offlineWristbands.map(wb => ({
      id: wb.wristbandId,
      location: wb.location,
      signalStrength: wb.signalStrength,
      status: wb.status,
      isOffline: wb.signalStrength === 0 || wb.location.toLowerCase().includes('unknown')
    }))
  })
  
  // Group online wristbands by type
  const familyWristbands = onlineWristbands.filter((wb) => wb.group === 'Family')
  const guestWristbands = onlineWristbands.filter((wb) => wb.group === 'Guest')
  const testWristbands = onlineWristbands.filter((wb) => wb.group === 'Test')

  const toggleGroupCollapse = (group: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(group)) {
        newSet.delete(group)
      } else {
        newSet.add(group)
      }
      return newSet
    })
  }

  const handleGuestClick = (wristband: any) => {
    console.log("🔍 Looking up guest for wristband:", wristband.wristbandId)
    
    // 1. Find the wristband in Supabase database
    const supabaseWristband = guestAssignments.find((wb: any) => wb.wristband_id === wristband.wristbandId)
    console.log("📱 Found Supabase wristband:", supabaseWristband)
    
    let guest: any = null
    let cabin: any = null
    
    if (supabaseWristband && supabaseWristband.guest_id) {
      // 2. Find the guest using the guest_id from wristband
      guest = allGuests.find((g: any) => g.id === supabaseWristband.guest_id)
      console.log("👤 Found guest from wristband:", guest)
      
      if (guest) {
        // 3. Find the cabin assigned to this guest (check both guest_id_1 and guest_id_2)
        cabin = allCabins.find((c: any) => c.guest_id_1 === guest.id || c.guest_id_2 === guest.id)
        console.log("🏠 Found cabin for guest:", cabin)
      }
    }
    
    // If no guest found through wristband, try to find by name as fallback
    if (!guest) {
      guest = allGuests.find((g: any) => g.name === wristband.guestName)
      console.log("👤 Found guest by name fallback:", guest)
      
      if (guest) {
        cabin = allCabins.find((c: any) => c.guest_id_1 === guest.id || c.guest_id_2 === guest.id)
      }
    }
    
    // If still no guest found, create a basic guest object from live data
    if (!guest) {
      console.log("⚠️ No guest found in database, creating from live data")
      guest = {
        name: wristband.guestName,
        email: wristband.guestEmail || '',
        phone: '',
        guest_type: 'Guest',
        allergies: '',
        special_requests: '',
        profile_photo: '',
        photo_url: '',
        cabin_id: wristband.cabinNumber,
        wristband_id: wristband.wristbandId,
      }
    }

    // Transform data to match GuestProfilePopup interface
    const transformedGuest = {
      name: guest.name || wristband.guestName,
      email: guest.email || wristband.guestEmail || '',
      phone: guest.phone || '',
      guest_type: guest.guest_type || 'Guest',
      allergies: guest.allergies || '',
      special_requests: guest.special_requests || '',
      profile_photo: guest.photo_url || guest.profile_photo || '',
    }
    
    const transformedWristband = {
      wristband_id: wristband.wristbandId,
      location: wristband.location,
      previousLocation: wristband.previousLocation,
      signalStrength: wristband.signalStrength,
      isOnTheMove: wristband.isOnTheMove,
      cabin: cabin ? `${cabin.cabin_number} - ${cabin.cabin_name}` : wristband.cabinNumber || 'Unknown Location',
    }
    
    console.log("✅ Final transformed data:", { guest: transformedGuest, wristband: transformedWristband })
    
    setSelectedWristband({ guest: transformedGuest, wristband: transformedWristband })
    setShowGuestProfile(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              🛥️ Renaissance
            </h1>
            <p className="text-slate-400 mt-2">Real-time guest location and signal monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              <span className={isConnected ? "text-green-400" : "text-red-400"}>
                {isConnected ? "Live System Active" : "System Offline"}
              </span>
            </div>
            <Badge variant="outline" className="border-blue-400 text-blue-400">
              Last Update: {mounted ? lastUpdate.toLocaleTimeString() : '--:--:--'}
            </Badge>
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              className="border-blue-400 text-blue-400 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{trackingStats?.activeWristbands || 0}</p>
                  <p className="text-slate-400 text-sm">Active Wristbands</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Navigation className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{trackingStats?.onTheMoveCount || 0}</p>
                  <p className="text-slate-400 text-sm">On The Move</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Signal className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{trackingStats?.averageSignal || 0}%</p>
                  <p className="text-slate-400 text-sm">Avg Signal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{trackingStats?.maintenanceCount || 0}</p>
                  <p className="text-slate-400 text-sm">Maintenance</p>
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Movement Alert */}
        {movingWristbands.length > 0 && (
          <Alert className="bg-orange-900/20 border-orange-500 cursor-pointer hover:bg-orange-900/30 transition-colors" onClick={() => {
            // Scroll to the first moving wristband
            const firstMovingWristband = movingWristbands[0]
            const element = document.getElementById(`wristband-${firstMovingWristband.id}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              // Add a temporary highlight effect
              element.classList.add('ring-4', 'ring-orange-500', 'ring-opacity-50')
              setTimeout(() => {
                element.classList.remove('ring-4', 'ring-orange-500', 'ring-opacity-50')
              }, 3000)
            }
          }}>
            <Navigation className="h-4 w-4" />
            <AlertDescription>
              <strong>{movingWristbands.length} Guest(s) on the move:</strong>{" "}
              {movingWristbands.map((wb) => wb.guestName).join(", ")} - Click to view
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search guests, wristbands, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-400"
          />
        </div>

        {/* Group Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className={activeFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300'}
          >
            All ({wristbands.length})
          </Button>
          <Button
            variant={activeFilter === 'family' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('family')}
            className={activeFilter === 'family' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-400'}
          >
            Family ({familyWristbands.length})
          </Button>
          <Button
            variant={activeFilter === 'guest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('guest')}
            className={activeFilter === 'guest' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-600 text-blue-400'}
          >
            Guest ({guestWristbands.length})
          </Button>
          <Button
            variant={activeFilter === 'test' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('test')}
            className={activeFilter === 'test' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-600 text-purple-400'}
          >
            Test ({testWristbands.length})
          </Button>
        </div>



        {/* Collapsible Wristband Groups */}
        <div className="space-y-4">
          {/* Family Group */}
          {familyWristbands.length > 0 && (
            <div className="bg-slate-800/30 border border-green-500/30 rounded-lg">
              <button
                onClick={() => toggleGroupCollapse('Family')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <h3 className="text-lg font-semibold text-green-400">Family</h3>
                  <Badge variant="outline" className="border-green-400 text-green-400">
                    {familyWristbands.length}
                  </Badge>
                </div>
                {collapsedGroups.has('Family') ? (
                  <ChevronRight className="h-5 w-5 text-green-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-green-400" />
                )}
              </button>
              
              {!collapsedGroups.has('Family') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-green-500/30">
                                     {familyWristbands.map((wristband) => (
                     <Card
                       key={wristband.id}
                       id={`wristband-${wristband.id}`}
                       className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer ${
                         wristband.isOnTheMove ? "ring-2 ring-orange-500 shadow-lg shadow-orange-500/20" : ""
                       }`}
                       onClick={() => handleGuestClick(wristband)}
                     >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-lg">{wristband.guestName}</CardTitle>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(wristband.status)}`} />
                            {wristband.isOnTheMove && (
                              <div className="flex items-center gap-1">
                                <Navigation className="h-4 w-4 text-orange-400 animate-pulse" />
                                <span className="text-orange-400 text-xs font-bold animate-pulse">ON THE MOVE</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-slate-400">
                          ID: {wristband.wristbandId} • {wristband.status.replace("_", " ").toUpperCase()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Location */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-400" />
                            <span className="text-white font-medium">{getDisplayLocation(wristband)}</span>
                            {wristband.cabinNumber && (
                              <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">
                                {wristband.cabinNumber}
                              </Badge>
                            )}
                          </div>

                          {/* Previous location if moving */}
                          {wristband.isOnTheMove && wristband.previousLocation && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span>From:</span>
                              <span className="line-through">{wristband.previousLocation}</span>
                            </div>
                          )}
                        </div>

                        {/* Signal Strength */}
                        <div className="flex items-center gap-2">
                          <Signal className={`h-4 w-4 ${getSignalColor(wristband.signalStrength)}`} />
                          <span className="text-sm text-slate-300">Signal: {wristband.signalStrength} dBm</span>
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                wristband.signalStrength >= -59
                                  ? "bg-green-500"
                                  : wristband.signalStrength >= -69
                                    ? "bg-yellow-500"
                                    : wristband.signalStrength >= -79
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, ((wristband.signalStrength + 100) / 50) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Movement indicator with glow effect */}
                        {wristband.isOnTheMove && (
                          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 animate-pulse">
                            <div className="flex items-center gap-2">
                              <Navigation className="h-5 w-5 text-orange-400" />
                              <span className="text-orange-400 font-bold">GUEST IS ON THE MOVE</span>
                            </div>
                            {wristband.locationChangedAt && (
                              <div className="text-xs text-orange-300 mt-1">
                                Location changed: {new Date(wristband.locationChangedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Alerts */}
                        {wristband.alerts.length > 0 && (
                          <div className="space-y-1">
                            {wristband.alerts.map((alert, index) => (
                              <Badge key={index} variant="destructive" className="text-xs block">
                                {alert}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                          Last seen: {new Date(wristband.lastSeen).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Guest Group */}
          {guestWristbands.length > 0 && (
            <div className="bg-slate-800/30 border border-blue-500/30 rounded-lg">
              <button
                onClick={() => toggleGroupCollapse('Guest')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <h3 className="text-lg font-semibold text-blue-400">Guest</h3>
                  <Badge variant="outline" className="border-blue-400 text-blue-400">
                    {guestWristbands.length}
                  </Badge>
                </div>
                {collapsedGroups.has('Guest') ? (
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-blue-400" />
                )}
              </button>
              
              {!collapsedGroups.has('Guest') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-blue-500/30">
                  {guestWristbands.map((wristband) => (
                    <Card
                      key={wristband.id}
                      id={`wristband-${wristband.id}`}
                      className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer ${
                        wristband.isOnTheMove ? "ring-2 ring-orange-500 shadow-lg shadow-orange-500/20" : ""
                      }`}
                      onClick={() => handleGuestClick(wristband)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-lg">{wristband.guestName}</CardTitle>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(wristband.status)}`} />
                            {wristband.isOnTheMove && (
                              <div className="flex items-center gap-1">
                                <Navigation className="h-4 w-4 text-orange-400 animate-pulse" />
                                <span className="text-orange-400 text-xs font-bold animate-pulse">ON THE MOVE</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-slate-400">
                          ID: {wristband.wristbandId} • {wristband.status.replace("_", " ").toUpperCase()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Location */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-400" />
                            <span className="text-white font-medium">{getDisplayLocation(wristband)}</span>
                            {wristband.cabinNumber && (
                              <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">
                                {wristband.cabinNumber}
                              </Badge>
                            )}
                          </div>

                          {/* Previous location if moving */}
                          {wristband.isOnTheMove && wristband.previousLocation && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span>From:</span>
                              <span className="line-through">{wristband.previousLocation}</span>
                            </div>
                          )}
                        </div>

                        {/* Signal Strength */}
                        <div className="flex items-center gap-2">
                          <Signal className={`h-4 w-4 ${getSignalColor(wristband.signalStrength)}`} />
                          <span className="text-sm text-slate-300">Signal: {wristband.signalStrength} dBm</span>
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                wristband.signalStrength >= -59
                                  ? "bg-green-500"
                                  : wristband.signalStrength >= -69
                                    ? "bg-yellow-500"
                                    : wristband.signalStrength >= -79
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, ((wristband.signalStrength + 100) / 50) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Movement indicator with glow effect */}
                        {wristband.isOnTheMove && (
                          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 animate-pulse">
                            <div className="flex items-center gap-2">
                              <Navigation className="h-5 w-5 text-orange-400" />
                              <span className="text-orange-400 font-bold">GUEST IS ON THE MOVE</span>
                            </div>
                            {wristband.locationChangedAt && (
                              <div className="text-xs text-orange-300 mt-1">
                                Location changed: {new Date(wristband.locationChangedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Alerts */}
                        {wristband.alerts.length > 0 && (
                          <div className="space-y-1">
                            {wristband.alerts.map((alert, index) => (
                              <Badge key={index} variant="destructive" className="text-xs block">
                                {alert}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                          Last seen: {new Date(wristband.lastSeen).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Test Group */}
          {testWristbands.length > 0 && (
            <div className="bg-slate-800/30 border border-purple-500/30 rounded-lg">
              <button
                onClick={() => toggleGroupCollapse('Test')}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                  <h3 className="text-lg font-semibold text-purple-400">Test</h3>
                  <Badge variant="outline" className="border-purple-400 text-purple-400">
                    {testWristbands.length}
                  </Badge>
                </div>
                {collapsedGroups.has('Test') ? (
                  <ChevronRight className="h-5 w-5 text-purple-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-purple-400" />
                )}
              </button>
              
              {!collapsedGroups.has('Test') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-purple-500/30">
                  {testWristbands.map((wristband) => (
                    <Card
                      key={wristband.id}
                      id={`wristband-${wristband.id}`}
                      className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer ${
                        wristband.isOnTheMove ? "ring-2 ring-orange-500 shadow-lg shadow-orange-500/20" : ""
                      }`}
                      onClick={() => handleGuestClick(wristband)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-lg">{wristband.guestName}</CardTitle>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(wristband.status)}`} />
                            {wristband.isOnTheMove && (
                              <div className="flex items-center gap-1">
                                <Navigation className="h-4 w-4 text-orange-400 animate-pulse" />
                                <span className="text-orange-400 text-xs font-bold animate-pulse">ON THE MOVE</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-slate-400">
                          ID: {wristband.wristbandId} • {wristband.status.replace("_", " ").toUpperCase()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Location */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-400" />
                            <span className="text-white font-medium">{getDisplayLocation(wristband)}</span>
                            {wristband.cabinNumber && (
                              <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">
                                {wristband.cabinNumber}
                              </Badge>
                            )}
                          </div>

                          {/* Previous location if moving */}
                          {wristband.isOnTheMove && wristband.previousLocation && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span>From:</span>
                              <span className="line-through">{wristband.previousLocation}</span>
                            </div>
                          )}
                        </div>

                        {/* Signal Strength */}
                        <div className="flex items-center gap-2">
                          <Signal className={`h-4 w-4 ${getSignalColor(wristband.signalStrength)}`} />
                          <span className="text-sm text-slate-300">Signal: {wristband.signalStrength} dBm</span>
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                wristband.signalStrength >= -59
                                  ? "bg-green-500"
                                  : wristband.signalStrength >= -69
                                    ? "bg-yellow-500"
                                    : wristband.signalStrength >= -79
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, ((wristband.signalStrength + 100) / 50) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Movement indicator with glow effect */}
                        {wristband.isOnTheMove && (
                          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 animate-pulse">
                            <div className="flex items-center gap-2">
                              <Navigation className="h-5 w-5 text-orange-400" />
                              <span className="text-orange-400 font-bold">GUEST IS ON THE MOVE</span>
                            </div>
                            {wristband.locationChangedAt && (
                              <div className="text-xs text-orange-300 mt-1">
                                Location changed: {new Date(wristband.locationChangedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Alerts */}
                        {wristband.alerts.length > 0 && (
                          <div className="space-y-1">
                            {wristband.alerts.map((alert, index) => (
                              <Badge key={index} variant="destructive" className="text-xs block">
                                {alert}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                          Last seen: {new Date(wristband.lastSeen).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Offline Devices */}
        {offlineWristbands.length > 0 && (
          <div className="bg-slate-800/30 border border-gray-500/30 rounded-lg">
            <button
              onClick={() => toggleGroupCollapse('Offline')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <h3 className="text-lg font-semibold text-gray-400">Offline</h3>
                <Badge variant="outline" className="border-gray-400 text-gray-400">
                  {offlineWristbands.length}
                </Badge>
              </div>
              {collapsedGroups.has('Offline') ? (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {!collapsedGroups.has('Offline') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-gray-500/30">
                {offlineWristbands.map((wristband) => (
                  <Card
                    key={wristband.id}
                    id={`wristband-${wristband.id}`}
                    className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer opacity-60"
                    onClick={() => handleGuestClick(wristband)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-lg">{wristband.guestName}</CardTitle>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        </div>
                      </div>
                      <CardDescription className="text-slate-400">
                        ID: {wristband.wristbandId} • OFFLINE
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Location */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 font-medium">Unknown Location</span>
                        </div>
                      </div>

                      {/* Signal Strength */}
                      <div className="flex items-center gap-2">
                        <Signal className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Signal: 0 dBm</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div className="h-2 rounded-full bg-gray-400" style={{ width: "0%" }} />
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                        Last seen: {new Date(wristband.lastSeen).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guest Profile Popup */}
        <GuestProfilePopup
          guest={selectedWristband?.guest || null}
          wristband={selectedWristband?.wristband || null}
          isOpen={showGuestProfile}
          onClose={() => {
            setShowGuestProfile(false)
            setSelectedWristband(null)
          }}
        />
      </div>
    </div>
  )
}

// Default export
export default LiveTrackingDashboard
