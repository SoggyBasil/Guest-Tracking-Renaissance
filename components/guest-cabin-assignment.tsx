"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"
import { Users, Home, Search, UserPlus, Bed, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { GuestProfilePopup } from "./guest-profile-popup"
import { YachtCabinLayout } from "./yacht-cabin-layout"

interface Guest {
  id: string
  name: string
  guest_type: string
  allergies?: string
  special_requests?: string
  photo_url?: string
  cabin_id?: string
  wristband_id?: string
  created_at: string
  cabin?: {
    cabin_number: string
    cabin_name: string
    deck: string
  } | null
}

interface Cabin {
  id: string
  cabin_number: string
  cabin_name: string
  cabin_type: string
  deck: string
  capacity: number
  position: string
  guest_id_1?: string
  guest_id_2?: string
  occupied_since?: string
  guest_1?: Guest
  guest_2?: Guest
  wristbands?: Wristband[]
}

interface Wristband {
  id: string
  wristband_id: string
  guest_id?: string
  status: string
  battery_level: number
  signal_strength: number
  last_location?: string
  last_seen: string
  guest?: Guest
}

export function GuestCabinAssignment() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [wristbands, setWristbands] = useState<Wristband[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [selectedCabin, setCabin] = useState<string>("")
  const [selectedWristband, setWristband] = useState<string>("")
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [showGuestProfile, setShowGuestProfile] = useState(false)
  const [profileGuest, setProfileGuest] = useState<Guest | null>(null)

  // New guest form state
  const [newGuest, setNewGuest] = useState({
    name: "",
    guest_type: "Guest",
    allergies: "",
    special_requests: "",
    photo_url: "",
  })
  
  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data separately
      const [guestsResponse, cabinsResponse, wristbandsResponse] = await Promise.all([
        supabase.from("guests").select("*").order("created_at", { ascending: false }),
        supabase.from("yacht_cabins").select("*"),
        supabase.from("wristbands").select("*").order("wristband_id"),
      ])

      if (guestsResponse.error) throw guestsResponse.error
      if (cabinsResponse.error) throw cabinsResponse.error
      if (wristbandsResponse.error) throw wristbandsResponse.error

      const guestsData = guestsResponse.data || []
      const cabinsData = cabinsResponse.data || []
      const wristbandsData = wristbandsResponse.data || []

      // Process guests to add wristband and cabin information
      const processedGuests = guestsData.map(guest => {
        // Find wristband for this guest
        const assignedWristband = wristbandsData.find(wristband => wristband.guest_id === guest.id)
        
        // Find cabin for this guest (check both guest_id_1 and guest_id_2)
        const assignedCabin = cabinsData.find(cabin => 
          cabin.guest_id_1 === guest.id || cabin.guest_id_2 === guest.id
        )
        
        return {
          ...guest,
          wristband_id: assignedWristband?.wristband_id || null,
          cabin: assignedCabin ? {
            cabin_number: assignedCabin.cabin_number,
            cabin_name: assignedCabin.cabin_name,
            deck: assignedCabin.deck
          } : null
        }
      })

      // Manually link wristbands with guests since foreign key relationship doesn't exist
      const linkedWristbands = wristbandsData.map(wristband => ({
        ...wristband,
        guest: guestsData.find(guest => guest.id === wristband.guest_id)
      }))

      // Link wristbands to cabins based on wristband_id pattern (e.g., "G1 602" -> cabin 602)
      const cabinsWithWristbands = cabinsData.map(cabin => {
        const cabinWristbands = linkedWristbands.filter(wristband => 
          wristband.wristband_id.includes(` ${cabin.cabin_number}`)
        )
        return {
          ...cabin,
          wristbands: cabinWristbands
        }
      })

      // Sort cabins by deck order and then by cabin number numerically
      const sortedCabins = cabinsWithWristbands.sort((a, b) => {
        // Define deck order (highest to lowest)
        const deckOrder = {
          'OWNERS DECK': 1,
          'SPA DECK': 2,
          'UPPER DECK': 3
        }
        
        // First sort by deck
        const deckA = deckOrder[a.deck as keyof typeof deckOrder] || 999
        const deckB = deckOrder[b.deck as keyof typeof deckOrder] || 999
        
        if (deckA !== deckB) {
          return deckA - deckB
        }
        
        // Then sort by cabin number numerically
        const cabinNumA = parseInt(a.cabin_number)
        const cabinNumB = parseInt(b.cabin_number)
        return cabinNumA - cabinNumB
      })

      setGuests(processedGuests)
      setCabins(sortedCabins)
      setWristbands(linkedWristbands)
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleAssignCabin = async () => {
    if (!selectedGuest || !selectedCabin) return

    try {
      // Find the cabin to check current occupancy
      const cabin = cabins.find(c => c.cabin_number === selectedCabin)
      if (!cabin) {
        setError("Cabin not found")
        return
      }

      // Determine which guest_id slot to use
      let updateData: any = {
        occupied_since: new Date().toISOString(),
      }

      if (!cabin.guest_id_1) {
        updateData.guest_id_1 = selectedGuest.id
      } else if (!cabin.guest_id_2) {
        updateData.guest_id_2 = selectedGuest.id
      } else {
        setError("Cabin is already fully occupied")
        return
      }

      // Update cabin with guest assignment
      const { error: cabinError } = await supabase
        .from("yacht_cabins")
        .update(updateData)
        .eq("cabin_number", selectedCabin)

      if (cabinError) throw cabinError

      // Update guest with cabin assignment
      const { error: guestError } = await supabase
        .from("guests")
        .update({ cabin_id: selectedCabin })
        .eq("id", selectedGuest.id)

      if (guestError) throw guestError

      await fetchData()
      setSelectedGuest(null)
      setCabin("")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAssignWristband = async () => {
    if (!selectedGuest || !selectedWristband) return

    try {
      // Update wristband with guest assignment
      const { error: wristbandError } = await supabase
        .from("wristbands")
        .update({ guest_id: selectedGuest.id })
        .eq("wristband_id", selectedWristband)

      if (wristbandError) throw wristbandError

      // Update guest with wristband assignment
      const { error: guestError } = await supabase
        .from("guests")
        .update({ wristband_id: selectedWristband })
        .eq("id", selectedGuest.id)

      if (guestError) throw guestError

      await fetchData()
      setSelectedGuest(null)
      setWristband("")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUnassignCabin = async (cabinId: string, guestId: string) => {
    try {
      const cabin = cabins.find((c) => c.id === cabinId)
      if (!cabin) return

      // Determine which guest_id to remove
      let updateData: any = {}
      
      if (cabin.guest_id_1 === guestId) {
        updateData.guest_id_1 = null
      } else if (cabin.guest_id_2 === guestId) {
        updateData.guest_id_2 = null
      } else {
        setError("Guest not found in this cabin")
        return
      }

      // If both guests are being removed, also clear occupied_since
      if ((cabin.guest_id_1 === guestId && !cabin.guest_id_2) || 
          (cabin.guest_id_2 === guestId && !cabin.guest_id_1)) {
        updateData.occupied_since = null
      }

      // Update cabin to remove guest
      const { error: cabinError } = await supabase
        .from("yacht_cabins")
        .update(updateData)
        .eq("id", cabinId)

      if (cabinError) throw cabinError

      // Update guest to remove cabin assignment
      const { error: guestError } = await supabase
        .from("guests")
        .update({ cabin_id: null })
        .eq("id", guestId)

      if (guestError) throw guestError

      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUnassignWristband = async (wristbandId: string) => {
    try {
      const wristband = wristbands.find((w) => w.id === wristbandId)
      if (!wristband) return

      // Update wristband to remove guest
      const { error: wristbandError } = await supabase
        .from("wristbands")
        .update({ guest_id: null })
        .eq("id", wristbandId)

      if (wristbandError) throw wristbandError

      // Update guest to remove wristband assignment
      if (wristband.guest_id) {
        const { error: guestError } = await supabase
          .from("guests")
          .update({ wristband_id: null })
          .eq("id", wristband.guest_id)

        if (guestError) throw guestError
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddGuest = async () => {
    try {
      // Validate required fields
      if (!newGuest.name.trim()) {
        setError("Name is required")
        return
      }

      let photoUrl = null
      
      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `guest-photos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('guest-photos')
          .upload(filePath, photoFile)

        if (uploadError) {
          console.error('Error uploading photo:', uploadError)
          setError('Failed to upload photo')
          return
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('guest-photos')
          .getPublicUrl(filePath)
        
        photoUrl = publicUrl
      }

      const { error } = await supabase.from("guests").insert([
        {
          name: newGuest.name.trim(),
          guest_type: newGuest.guest_type,
          allergies: newGuest.allergies.trim() || null,
          special_requests: newGuest.special_requests.trim() || null,
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      await fetchData()
      setShowAddGuest(false)
      setNewGuest({
        name: "",
        guest_type: "Guest",
        allergies: "",
        special_requests: "",
        photo_url: "",
      })
      setPhotoFile(null)
      setPhotoPreview("")
      setError(null) // Clear any previous errors
    } catch (err: any) {
      console.error("Error adding guest:", err)
      setError(err.message || "Failed to add guest")
    }
  }

  const handleViewProfile = (guest: Guest) => {
    setProfileGuest(guest)
    setShowGuestProfile(true)
  }

  const filteredGuests = guests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.guest_type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const availableCabins = cabins.filter((cabin) => !cabin.guest_id_1 && !cabin.guest_id_2)
  const availableWristbands = wristbands.filter((wristband) => !wristband.guest_id)
  const assignedCabins = cabins.filter((cabin) => cabin.guest_id_1 || cabin.guest_id_2)
  const assignedWristbands = wristbands.filter((wristband) => wristband.guest_id)

  if (loading) {
    return (
      <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
        <p className="cyber-green">Loading assignment data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold cyber-green">Guest & Cabin Assignment</h1>
          <p className="text-gray-400 mt-2">Manage guest accommodations and wristband assignments</p>
        </div>
        <Dialog open={showAddGuest} onOpenChange={setShowAddGuest}>
          <DialogTrigger asChild>
            <Button className="cyber-border bg-green-600 hover:bg-green-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="cyber-bg cyber-border">
            <DialogHeader>
              <DialogTitle className="cyber-green">Add New Guest</DialogTitle>
              <DialogDescription>Enter the guest details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newGuest.name}
                    onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                    className="cyber-border bg-black/50"
                    placeholder="Enter guest name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_type">Guest Type</Label>
                  <Select
                    value={newGuest.guest_type}
                    onValueChange={(value) => setNewGuest({ ...newGuest, guest_type: value })}
                  >
                    <SelectTrigger className="cyber-border bg-black/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Photo Upload Section */}
              <div>
                <Label htmlFor="photo">Guest Photo</Label>
                <div className="mt-2 space-y-2">
                  {photoPreview && (
                    <div className="relative w-32 h-32">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border-2 border-green-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview("")
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPhotoFile(file)
                        const reader = new FileReader()
                        reader.onload = (e) => {
                          setPhotoPreview(e.target?.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="cyber-border bg-black/50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  value={newGuest.allergies}
                  onChange={(e) => setNewGuest({ ...newGuest, allergies: e.target.value })}
                  className="cyber-border bg-black/50"
                  placeholder="e.g., Nuts, Shellfish, Dairy"
                />
              </div>
              <div>
                <Label htmlFor="special_requests">Special Requests</Label>
                <Input
                  id="special_requests"
                  value={newGuest.special_requests}
                  onChange={(e) => setNewGuest({ ...newGuest, special_requests: e.target.value })}
                  className="cyber-border bg-black/50"
                  placeholder="e.g., Vegetarian meals, Early check-in"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddGuest(false)} className="cyber-border">
                  Cancel
                </Button>
                <Button onClick={handleAddGuest} className="bg-green-600 hover:bg-green-700">
                  Add Guest
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="cyber-border bg-red-900/20 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-bg cyber-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold cyber-green">{guests.length}</p>
                <p className="text-xs text-gray-400">Total Guests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cyber-bg cyber-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Home className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold cyber-green">{assignedCabins.length}</p>
                <p className="text-xs text-gray-400">Assigned Cabins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cyber-bg cyber-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bed className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold cyber-green">{availableCabins.length}</p>
                <p className="text-xs text-gray-400">Available Cabins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cyber-bg cyber-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold cyber-green">{assignedWristbands.length}</p>
                <p className="text-xs text-gray-400">Active Wristbands</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="guests" className="space-y-6">
        <TabsList className="cyber-border bg-black/50">
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="cabins">Cabins</TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 cyber-border bg-black/50"
            />
          </div>

          {/* Guest Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuests.map((guest) => (
              <Card key={guest.id} className="cyber-bg cyber-border hover:bg-gray-800/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    {guest.photo_url ? (
                      <img
                        src={guest.photo_url || "/placeholder.svg"}
                        alt={guest.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-green-500/50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold cyber-green">{guest.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="cyber-green text-lg">{guest.name}</CardTitle>
                      <CardDescription className="text-gray-400">{guest.guest_type}</CardDescription>
                    </div>
                    <Badge
                      variant={guest.guest_type === "Owner" ? "default" : "secondary"}
                      className={
                        guest.guest_type === "Owner"
                          ? "bg-gold-500/20 text-gold-400 border-gold-400"
                          : guest.guest_type === "Family"
                            ? "bg-blue-500/20 text-blue-400 border-blue-400"
                            : "bg-gray-500/20 text-gray-400 border-gray-400"
                      }
                    >
                      {guest.guest_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Cabin:</span>
                      <span className="ml-2 cyber-green">
                        {guest.cabin ? `${guest.cabin.cabin_number} - ${guest.cabin.cabin_name}` : "Not assigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Wristband:</span>
                      <span className="ml-2 cyber-green">{guest.wristband_id || "Not assigned"}</span>
                    </div>
                  </div>

                  {guest.allergies && (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">Allergies: {guest.allergies}</span>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(guest)}
                      className="flex-1 cyber-border"
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedGuest(guest)}
                      className="flex-1 cyber-border"
                    >
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cabins" className="space-y-4">
          <YachtCabinLayout 
            cabins={cabins} 
            onCabinClick={(cabin) => {
              // Handle cabin click
              // Refresh data after assignment
              fetchData()
            }}
          />
        </TabsContent>

        <TabsContent value="wristbands" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {wristbands.map((wristband) => (
              <Card
                key={wristband.id}
                className={`cyber-bg cyber-border ${
                  wristband.guest_id ? "ring-2 ring-blue-500/50" : "ring-2 ring-gray-600/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="cyber-green text-sm">{wristband.wristband_id}</CardTitle>
                    <Badge
                      variant={wristband.status === "active" ? "default" : "destructive"}
                      className={
                        wristband.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-400"
                          : "bg-red-500/20 text-red-400 border-red-400"
                      }
                    >
                      {wristband.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Battery:</span>
                      <span className="ml-1 cyber-green">{wristband.battery_level}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Signal:</span>
                      <span className="ml-1 cyber-green">{wristband.signal_strength}%</span>
                    </div>
                  </div>

                  {wristband.guest && (
                    <div className="space-y-1">
                      <div className="text-sm cyber-green font-medium">{wristband.guest.name}</div>
                      <div className="text-xs text-gray-400">{wristband.guest.guest_type}</div>
                    </div>
                  )}

                  {wristband.last_location && (
                    <div className="text-xs text-gray-400">
                      <span>Location:</span>
                      <span className="ml-1">{wristband.last_location}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Last seen: {new Date(wristband.last_seen).toLocaleString()}
                  </div>

                  {wristband.guest_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnassignWristband(wristband.id)}
                      className="w-full cyber-border text-red-400 border-red-400 hover:bg-red-400/10"
                    >
                      Unassign
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {selectedGuest && (
            <Card className="cyber-bg cyber-border">
              <CardHeader>
                <CardTitle className="cyber-green">Assign Resources to {selectedGuest.name}</CardTitle>
                <CardDescription>Select a cabin and/or wristband to assign to this guest.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cabin-select">Assign Cabin</Label>
                    <Select value={selectedCabin} onValueChange={setCabin}>
                      <SelectTrigger id="cabin-select" className="cyber-border bg-black/50">
                        <SelectValue placeholder="Select a cabin" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCabins.map((cabin) => (
                          <SelectItem key={cabin.id} value={cabin.cabin_number}>
                            {cabin.cabin_number} - {cabin.cabin_name} ({cabin.deck})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignCabin}
                      disabled={!selectedCabin}
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
                    >
                      Assign Cabin
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="wristband-select">Assign Wristband</Label>
                    <Select value={selectedWristband} onValueChange={setWristband}>
                      <SelectTrigger id="wristband-select" className="cyber-border bg-black/50">
                        <SelectValue placeholder="Select a wristband" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWristbands.map((wristband) => (
                          <SelectItem key={wristband.id} value={wristband.wristband_id}>
                            {wristband.wristband_id} (Battery: {wristband.battery_level}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignWristband}
                      disabled={!selectedWristband}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                    >
                      Assign Wristband
                    </Button>
                  </div>
                </div>

                <Button variant="outline" onClick={() => setSelectedGuest(null)} className="w-full cyber-border">
                  Cancel Assignment
                </Button>
              </CardContent>
            </Card>
          )}

          {!selectedGuest && (
            <Card className="cyber-bg cyber-border">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Select a guest from the Guests tab to begin assignment</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Guest Profile Popup */}
      <GuestProfilePopup
        guest={profileGuest}
        wristband={profileGuest ? {
          wristband_id: profileGuest.wristband_id || "Not assigned",
          location: profileGuest.cabin ? `${profileGuest.cabin.cabin_number} - ${profileGuest.cabin.cabin_name}` : "Not assigned",
          signalStrength: -50,
          cabin: profileGuest.cabin ? `${profileGuest.cabin.cabin_number} - ${profileGuest.cabin.cabin_name}` : undefined
        } : null}
        isOpen={showGuestProfile}
        onClose={() => {
          setShowGuestProfile(false)
          setProfileGuest(null)
        }}
      />
    </div>
  )
}
