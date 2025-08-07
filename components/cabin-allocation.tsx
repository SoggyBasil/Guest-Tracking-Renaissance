"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bed, User, Search, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface Cabin {
  id: string
  cabin_number: string
  capacity: number
  status: "available" | "occupied" | "maintenance" | "cleaning"
  guest_id?: string
  guest_name?: string
  guest_email?: string
}

interface Guest {
  id: string
  name: string
  email: string
}

export function CabinAllocation() {
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [availableGuests, setAvailableGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGuest, setSelectedGuest] = useState("")
  const [selectedCabin, setSelectedCabin] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCabins()
    fetchAvailableGuests()

    // Real-time subscriptions
    const subscription = supabase
      .channel("cabin_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "cabins" }, () => {
        fetchCabins()
        fetchAvailableGuests()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchCabins = async () => {
    try {
      const { data, error } = await supabase
        .from("cabins")
        .select(`
          *,
          guests (
            name,
            email
          )
        `)
        .order("cabin_number")

      if (error) throw error

      const cabinsWithGuests =
        data?.map((cabin) => ({
          ...cabin,
          status: cabin.guest_id ? "occupied" : "available",
          guest_name: cabin.guests?.name,
          guest_email: cabin.guests?.email,
        })) || []

      setCabins(cabinsWithGuests)
    } catch (error) {
      console.error("Error fetching cabins:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableGuests = async () => {
    try {
      // Get guests without cabin assignments
      const { data, error } = await supabase
        .from("guests")
        .select("id, name, email")
        .not("id", "in", `(SELECT guest_id FROM cabins WHERE guest_id IS NOT NULL)`)

      if (error) throw error
      setAvailableGuests(data || [])
    } catch (error) {
      console.error("Error fetching available guests:", error)
    }
  }

  const handleAllocateCabin = async () => {
    if (!selectedGuest || !selectedCabin) return

    try {
      const { error } = await supabase.from("cabins").update({ guest_id: selectedGuest }).eq("id", selectedCabin)

      if (error) throw error

      // Log activity
      await supabase.from("guest_activities").insert([
        {
          guest_id: selectedGuest,
          activity_type: "cabin_assign",
          details: { cabin_id: selectedCabin },
        },
      ])

      setSelectedGuest("")
      setSelectedCabin("")
      fetchCabins()
      fetchAvailableGuests()
    } catch (error) {
      console.error("Error allocating cabin:", error)
    }
  }

  const handleDeallocateCabin = async (cabinId: string, guestId?: string) => {
    try {
      const { error } = await supabase.from("cabins").update({ guest_id: null }).eq("id", cabinId)

      if (error) throw error

      // Log activity
      if (guestId) {
        await supabase.from("guest_activities").insert([
          {
            guest_id: guestId,
            activity_type: "cabin_release",
            details: { cabin_id: cabinId },
          },
        ])
      }

      fetchCabins()
      fetchAvailableGuests()
    } catch (error) {
      console.error("Error deallocating cabin:", error)
    }
  }

  const filteredCabins = cabins.filter(
    (cabin) =>
      cabin.cabin_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cabin.guest_name && cabin.guest_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const CabinCard = ({ cabin }: { cabin: Cabin }) => (
    <div
      className={`cyber-bg rounded-lg p-4 transition-all hover:cyber-glow ${
        cabin.status === "occupied" ? "border border-red-500/50" : "border border-green-500/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold cyber-green">{cabin.cabin_number}</h3>
        <Badge
          variant={cabin.status === "occupied" ? "destructive" : "default"}
          className={
            cabin.status === "occupied"
              ? "bg-red-500/20 text-red-400 border-red-400"
              : "bg-green-500/20 text-green-400 border-green-400"
          }
        >
          {cabin.status.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Bed className="h-4 w-4 text-gray-400" />
          <span className="text-sm">Capacity: {cabin.capacity}</span>
        </div>

        {cabin.status === "occupied" && cabin.guest_name && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 cyber-green" />
              <span className="text-sm font-medium">{cabin.guest_name}</span>
            </div>
            <p className="text-xs text-gray-400">{cabin.guest_email}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeallocateCabin(cabin.id, cabin.guest_id)}
              className="w-full cyber-border"
            >
              Deallocate
            </Button>
          </div>
        )}

        {cabin.status === "available" && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Available for allocation</p>
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
        <p className="cyber-green">Loading cabin data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green">Cabin Allocation System</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search cabins or guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-border bg-black/50"
            />
          </div>
        </CardHeader>

        <CardContent className="border-t border-green-500/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="guest-select" className="cyber-green">
                Select Guest
              </Label>
              <Select value={selectedGuest} onValueChange={setSelectedGuest}>
                <SelectTrigger className="cyber-border bg-black/50">
                  <SelectValue placeholder="Choose a guest" />
                </SelectTrigger>
                <SelectContent>
                  {availableGuests.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {guest.name} - {guest.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cabin-select" className="cyber-green">
                Select Cabin
              </Label>
              <Select value={selectedCabin} onValueChange={setSelectedCabin}>
                <SelectTrigger className="cyber-border bg-black/50">
                  <SelectValue placeholder="Choose a cabin" />
                </SelectTrigger>
                <SelectContent>
                  {cabins
                    .filter((c) => c.status === "available")
                    .map((cabin) => (
                      <SelectItem key={cabin.id} value={cabin.id}>
                        {cabin.cabin_number} (Capacity: {cabin.capacity})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAllocateCabin}
                disabled={!selectedGuest || !selectedCabin}
                className="w-full cyber-border bg-green-500/20 hover:bg-green-500/30"
              >
                <Plus className="h-4 w-4 mr-2" />
                Allocate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cabin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCabins.map((cabin) => (
          <CabinCard key={cabin.id} cabin={cabin} />
        ))}
      </div>

      {filteredCabins.length === 0 && (
        <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
          <p className="text-gray-400">No cabins found</p>
        </div>
      )}
    </div>
  )
}
