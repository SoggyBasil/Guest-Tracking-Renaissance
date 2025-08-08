"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Users, Watch, MapPin, Crown } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface Guest {
  id: string
  name: string
  guest_type: string
  allergies?: string
  special_requests?: string
}

interface Wristband {
  id: string
  wristband_id: string
  status: string
  battery_level: number
  guest_id?: string
}

interface Cabin {
  id: string
  cabin_number: string
  cabin_name: string
  deck: string
  cabin_type: string
  capacity: number
  position: string
  guest_id_1?: string
  guest_id_2?: string
  occupied_since?: string
  guest_1?: Guest
  guest_2?: Guest
}

interface CabinAssignmentDialogProps {
  cabin: Cabin | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignmentComplete: () => void
}

export function CabinAssignmentDialog({ 
  cabin, 
  open, 
  onOpenChange, 
  onAssignmentComplete 
}: CabinAssignmentDialogProps) {
  // Component rendered
  const [guests, setGuests] = useState<Guest[]>([])
  const [wristbands, setWristbands] = useState<Wristband[]>([])
  const [selectedGuest, setSelectedGuest] = useState<string>("")
  const [selectedWristband, setSelectedWristband] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch available guests (not currently assigned to a cabin)
      const { data: guestsData, error: guestsError } = await supabase
        .from("guests")
        .select("*")
        .is("cabin_id", null)
        .order("name")

      if (guestsError) throw guestsError

                     // Get wristbands for this specific cabin based on static assignments
        let wristbandIds: string[] = []
        
        switch (cabin?.cabin_number) {
          case '602': // Master Suite
            wristbandIds = ['P1 Mr', 'P2 Mrs', 'G1-602', 'G2-602']
            break
          case '504': // MIAMI
            wristbandIds = ['P3 Allison', 'G1-504', 'G2-504']
            break
          case '505': // NEW YORK
            wristbandIds = ['P4 Jonathan', 'G1-505', 'G2-505']
            break
          case '506': // PARIS
            wristbandIds = ['C1 Sophia', 'G1-506', 'G2-506']
            break
          case '507': // ROME
            wristbandIds = ['C2 Max', 'G1-507', 'G2-507']
            break
          default:
            // For other cabins, use the pattern matching
            wristbandIds = [`G1-${cabin?.cabin_number}`, `G2-${cabin?.cabin_number}`]
        }

        // Expand IDs to include both hyphen and space variations and owner short codes without names
        const expandedIds = new Set<string>()
        for (const id of wristbandIds) {
          expandedIds.add(id)
          // If it's a guest/staff pattern with hyphen, add space variant (e.g., G1-411 -> G1 411)
          if (/^G[12]-\d+$/.test(id)) {
            expandedIds.add(id.replace('-', ' '))
          }
          // If it's a guest/staff pattern with space, add hyphen variant (e.g., G1 411 -> G1-411)
          if (/^G[12] \d+$/.test(id)) {
            expandedIds.add(id.replace(' ', '-'))
          }
          // If it's an owner/staff named band like "P1 Mr" or "C1 Sophia", also include short code (P1 / C1)
          if (/^(P|C)\d+\s+/.test(id)) {
            const shortCode = id.split(' ')[0]
            expandedIds.add(shortCode)
          }
        }
        // Always include default pattern variants for this cabin number
        if (cabin?.cabin_number) {
          expandedIds.add(`G1-${cabin.cabin_number}`)
          expandedIds.add(`G2-${cabin.cabin_number}`)
          expandedIds.add(`G1 ${cabin.cabin_number}`)
          expandedIds.add(`G2 ${cabin.cabin_number}`)
        }
        const finalWristbandIds = Array.from(expandedIds)

       // Looking for wristbands for cabin

       // Fetch available wristbands for this cabin
       const { data: wristbandsData, error: wristbandsError } = await supabase
         .from("wristbands")
         .select("*")
         .is("guest_id", null)
         .in("wristband_id", finalWristbandIds)
         .order("wristband_id")

       if (wristbandsError) throw wristbandsError

               // Found available wristbands

       setGuests(guestsData || [])
       setWristbands(wristbandsData || [])
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!cabin || !selectedGuest) return

    try {
      setLoading(true)
      setError(null)

      // Start a transaction-like operation
      const updates = []

      // Check if cabin is already fully occupied
      if (cabin.guest_id_1 && cabin.guest_id_2) {
        setError("Cabin is already fully occupied")
        return
      }

      // Determine which guest_id slot to use
      let updateData: any = {
        occupied_since: new Date().toISOString(),
      }

      if (!cabin.guest_id_1) {
        updateData.guest_id_1 = selectedGuest
      } else if (!cabin.guest_id_2) {
        updateData.guest_id_2 = selectedGuest
      } else {
        setError("Cabin is already fully occupied")
        return
      }

      // 1. Update cabin with guest assignment
      const { error: cabinError } = await supabase
        .from("yacht_cabins")
        .update(updateData)
        .eq("id", cabin.id)

      if (cabinError) throw cabinError
      updates.push("Cabin assigned")

      // 2. Update guest with cabin assignment
      const { error: guestError } = await supabase
        .from("guests")
        .update({ cabin_id: cabin.id })  // Use the cabin UUID instead of cabin number
        .eq("id", selectedGuest)

      if (guestError) throw guestError
      updates.push("Guest updated")

      // 3. If wristband is selected, assign it
      if (selectedWristband) {
        const { error: wristbandError } = await supabase
          .from("wristbands")
          .update({ 
            guest_id: selectedGuest,
            status: "assigned"
          })
          .eq("id", selectedWristband)

        if (wristbandError) throw wristbandError
        updates.push("Wristband assigned")
      }

      // 4. Create guest_device_link record (optional - only if table exists)
      // Temporarily disabled to avoid UUID errors
      console.log("Skipping guest_device_link insert for now to avoid UUID issues")
      /*
      try {
        // Get the wristband UUID if a wristband is selected
        let wristbandUUID = null
        if (selectedWristband) {
          const selectedWristbandObj = wristbands.find(w => w.id === selectedWristband)
          wristbandUUID = selectedWristbandObj?.id || null
        }

        console.log("Inserting into guest_device_link with values:", {
          guest_id: selectedGuest,
          cabin_id: cabin.id,
          wristband_id: wristbandUUID,
          assigned_by: "System",
          notes: `Assigned to ${cabin.cabin_number} - ${cabin.cabin_name}`
        })

        const { error: linkError } = await supabase
          .from("guest_device_link")
          .insert({
            guest_id: selectedGuest,
            cabin_id: cabin.id,
            wristband_id: wristbandUUID,
            assigned_by: "System", // You can make this dynamic based on logged-in user
            notes: `Assigned to ${cabin.cabin_number} - ${cabin.cabin_name}`
          })

        if (linkError) {
          console.warn("Could not create guest_device_link record:", linkError)
          // Don't throw error - this is optional
        } else {
          updates.push("Assignment recorded")
        }
      } catch (linkErr) {
        console.warn("guest_device_link table may not exist:", linkErr)
        // Continue with assignment even if this fails
      }
      */

      console.log("Assignment completed:", updates)
      onAssignmentComplete()
      onOpenChange(false)
      
      // Reset form
      setSelectedGuest("")
      setSelectedWristband("")
      setSearchTerm("")
    } catch (err: any) {
      console.error("Error assigning guest:", err)
      setError(err.message || "Failed to assign guest")
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    if (!cabin || (!cabin.guest_id_1 && !cabin.guest_id_2)) return

    try {
      setLoading(true)
      setError(null)

      // For now, we'll unassign both guests if they exist
      // In a more sophisticated UI, you might want to let users choose which guest to unassign
      const guestsToUnassign = []
      if (cabin.guest_id_1) guestsToUnassign.push(cabin.guest_id_1)
      if (cabin.guest_id_2) guestsToUnassign.push(cabin.guest_id_2)

      console.log("Starting unassign process for guests:", guestsToUnassign, "cabin:", cabin.id)

      // Skip guest_device_link operations since the table doesn't exist yet
      console.log("Skipping guest_device_link operations - table doesn't exist")

      // 2. Update cabin to remove all guests
      const { data: cabinData, error: cabinError } = await supabase
        .from("yacht_cabins")
        .update({
          guest_id_1: null,
          guest_id_2: null,
          occupied_since: null,
        })
        .eq("id", cabin.id)
        .select()

      if (cabinError) {
        console.error("Cabin update error:", cabinError)
        throw cabinError
      }
      console.log("Cabin updated:", cabinData)

      // 3. Update all guests to remove cabin assignment
      for (const guestId of guestsToUnassign) {
        const { data: guestData, error: guestError } = await supabase
          .from("guests")
          .update({ cabin_id: null })
          .eq("id", guestId)
          .select()

        if (guestError) {
          console.error("Guest update error:", guestError)
          throw guestError
        }
        console.log("Guest updated:", guestData)
      }

      // 4. Unassign wristbands for all guests
      for (const guestId of guestsToUnassign) {
        // First, find any wristband assigned to this guest
        const { data: assignedWristbands, error: wristbandSearchError } = await supabase
          .from("wristbands")
          .select("*")
          .eq("guest_id", guestId)

        if (wristbandSearchError) {
          console.error("Error searching for assigned wristbands:", wristbandSearchError)
        } else if (assignedWristbands && assignedWristbands.length > 0) {
          console.log("Found assigned wristbands for guest", guestId, ":", assignedWristbands)
          
          // Unassign all wristbands assigned to this guest
          for (const wristband of assignedWristbands) {
            console.log("Unassigning wristband:", wristband.id)
            const { data: wristbandData, error: wristbandError } = await supabase
              .from("wristbands")
              .update({ 
                guest_id: null,
                status: "available"
              })
              .eq("id", wristband.id)
              .select()

            if (wristbandError) {
              console.error("Wristband update error:", wristbandError)
              throw wristbandError
            }
            console.log("Wristband updated:", wristbandData)
          }
        } else {
          console.log("No wristbands found assigned to guest:", guestId)
        }
      }

      console.log("Unassignment completed successfully")
      onAssignmentComplete()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Error unassigning guest:", err)
      setError(err.message || err.details || "Failed to unassign guest")
    } finally {
      setLoading(false)
    }
  }

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.guest_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCabinTypeIcon = (cabinType: string) => {
    switch (cabinType) {
      case "Master Suite":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "VIP Cabin":
        return <Users className="h-4 w-4 text-purple-500" />
      case "Staff Cabin":
        return <Users className="h-4 w-4 text-blue-500" />
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />
    }
  }

  const getWristbandDisplayName = (wristbandId: string) => {
    switch (wristbandId) {
      case 'P1 Mr':
        return 'P1 - Mr'
      case 'P2 Mrs':
        return 'P2 - Mrs'
      case 'P3 Allison':
        return 'P3 - Allison'
      case 'P4 Jonathan':
        return 'P4 - Jonathan'
      case 'C1 Sophia':
        return 'C1 - Sophia'
      case 'C2 Max':
        return 'C2 - Max'
      default:
        return wristbandId
    }
  }

  if (!cabin) {
    console.log("Dialog: No cabin provided")
    return null
  }

  console.log("Dialog: Rendering with cabin:", cabin, "open:", open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getCabinTypeIcon(cabin.cabin_type)}
            {cabin.cabin_number} - {cabin.cabin_name}
          </DialogTitle>
          <DialogDescription>
            {cabin.deck} • {cabin.cabin_type} • Capacity: {cabin.capacity}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {(cabin.guest_1 || cabin.guest_2) ? (
          // Show current assignments
          <div className="space-y-4">
            <Card className="bg-green-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-green-400">Currently Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cabin.guest_1 && (
                    <div className="space-y-2 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Guest 1:</span>
                        <span className="font-medium">{cabin.guest_1.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Type:</span>
                        <Badge variant="outline">{cabin.guest_1.guest_type}</Badge>
                      </div>
                    </div>
                  )}
                  
                  {cabin.guest_2 && (
                    <div className="space-y-2 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Guest 2:</span>
                        <span className="font-medium">{cabin.guest_2.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Type:</span>
                        <Badge variant="outline">{cabin.guest_2.guest_type}</Badge>
                      </div>
                    </div>
                  )}
                  
                  {cabin.occupied_since && (
                    <div className="flex items-center justify-between pt-2 border-t border-green-500/10">
                      <span className="text-sm text-gray-400">Occupied Since:</span>
                      <span className="text-sm">{new Date(cabin.occupied_since).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleUnassign}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? "Unassigning..." : "Unassign All Guests"}
            </Button>
          </div>
        ) : (
          // Show assignment form
          <div className="space-y-4">
            <div>
              <Label htmlFor="guest-search">Search Guests</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="guest-search"
                  placeholder="Search by name or guest type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Select Guest</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                {filteredGuests.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {searchTerm ? "No guests found matching your search" : "No available guests"}
                  </p>
                ) : (
                  filteredGuests.map((guest) => (
                    <Card
                      key={guest.id}
                      className={`cursor-pointer transition-colors ${
                        selectedGuest === guest.id
                          ? "bg-blue-500/10 border-blue-500/20"
                          : "hover:bg-gray-500/10"
                      }`}
                      onClick={() => setSelectedGuest(guest.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{guest.name}</p>
                            <p className="text-sm text-gray-400">{guest.guest_type}</p>
                          </div>
                          <Badge variant="outline">{guest.guest_type}</Badge>
                        </div>
                        {guest.allergies && (
                          <p className="text-xs text-red-400 mt-1">
                            ⚠️ Allergies: {guest.allergies}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {wristbands.length > 0 && (
              <div>
                <Label>Available Wristbands</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {wristbands.map((wristband) => (
                    <Card
                      key={wristband.id}
                      className={`cursor-pointer transition-colors ${
                        selectedWristband === wristband.id
                          ? "bg-purple-500/10 border-purple-500/20"
                          : "hover:bg-gray-500/10"
                      }`}
                      onClick={() => setSelectedWristband(wristband.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                                                     <div className="flex items-center gap-2">
                             <Watch className="h-4 w-4 text-purple-400" />
                             <span className="font-medium">{getWristbandDisplayName(wristband.wristband_id)}</span>
                           </div>
                          <Badge 
                            variant="outline" 
                            className={wristband.battery_level > 20 ? "text-green-400" : "text-red-400"}
                          >
                            {wristband.battery_level}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleAssign}
              disabled={!selectedGuest || loading}
              className="w-full"
            >
              {loading ? "Assigning..." : `Assign to ${cabin.cabin_number}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
