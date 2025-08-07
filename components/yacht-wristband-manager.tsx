"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Wifi, Battery, Signal, UserPlus, UserMinus, Crown, Users, Briefcase } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface YachtWristband {
  id: string
  wristband_id: string
  guest_id?: string
  status: "available" | "assigned" | "maintenance"
  battery_level: number
  last_sync: string
  wristband_type: "Owner" | "Guest" | "Staff"
  guest_name?: string
  guest_email?: string
  guest_type?: string
}

interface Guest {
  id: string
  name: string
  email: string
  guest_type: string
}

export function YachtWristbandManager() {
  const [wristbands, setWristbands] = useState<YachtWristband[]>([])
  const [availableGuests, setAvailableGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGuest, setSelectedGuest] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWristbands()
    fetchAvailableGuests()

    const subscription = supabase
      .channel("yacht_wristband_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "wristbands" }, fetchWristbands)
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, fetchAvailableGuests)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchWristbands = async () => {
    try {
      const { data, error } = await supabase
        .from("wristbands")
        .select(`
          *,
          guests (
            name,
            email,
            guest_type
          )
        `)
        .order("wristband_type")
        .order("wristband_id")

      if (error) throw error

      const wristbandsWithGuests =
        data?.map((wb) => ({
          ...wb,
          guest_name: wb.guests?.name,
          guest_email: wb.guests?.email,
          guest_type: wb.guests?.guest_type,
        })) || []

      setWristbands(wristbandsWithGuests)
    } catch (error) {
      console.error("Error fetching wristbands:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableGuests = async () => {
    try {
      const { data, error } = await supabase
        .from("guests")
        .select("id, name, email, guest_type")
        .not("id", "in", `(SELECT guest_id FROM wristbands WHERE guest_id IS NOT NULL)`)

      if (error) throw error
      setAvailableGuests(data || [])
    } catch (error) {
      console.error("Error fetching available guests:", error)
    }
  }

  const assignWristband = async (wristbandId: string, guestId: string) => {
    try {
      const { error } = await supabase
        .from("wristbands")
        .update({
          guest_id: guestId,
          status: "assigned",
          last_sync: new Date().toISOString(),
        })
        .eq("id", wristbandId)

      if (error) throw error

      await supabase.from("guest_activities").insert([
        {
          guest_id: guestId,
          activity_type: "wristband_assign",
          details: { wristband_id: wristbandId },
        },
      ])

      fetchWristbands()
      fetchAvailableGuests()
      setSelectedGuest("")
    } catch (error) {
      console.error("Error assigning wristband:", error)
    }
  }

  const unassignWristband = async (wristbandId: string, guestId?: string) => {
    try {
      const { error } = await supabase
        .from("wristbands")
        .update({
          guest_id: null,
          status: "available",
        })
        .eq("id", wristbandId)

      if (error) throw error

      if (guestId) {
        await supabase.from("guest_activities").insert([
          {
            guest_id: guestId,
            activity_type: "wristband_release",
            details: { wristband_id: wristbandId },
          },
        ])
      }

      fetchWristbands()
      fetchAvailableGuests()
    } catch (error) {
      console.error("Error unassigning wristband:", error)
    }
  }

  const getWristbandIcon = (type: string) => {
    switch (type) {
      case "Owner":
        return <Crown className="h-4 w-4 text-yellow-400" />
      case "Staff":
        return <Briefcase className="h-4 w-4 text-blue-400" />
      default:
        return <Users className="h-4 w-4 text-green-400" />
    }
  }

  const getWristbandColor = (type: string) => {
    switch (type) {
      case "Owner":
        return "border-yellow-500/50 bg-yellow-500/10"
      case "Staff":
        return "border-blue-500/50 bg-blue-500/10"
      default:
        return "border-green-500/50 bg-green-500/10"
    }
  }

  const filteredWristbands = wristbands.filter((wb) => {
    const matchesSearch =
      wb.wristband_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wb.guest_name && wb.guest_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter = filterType === "all" || wb.wristband_type === filterType

    return matchesSearch && matchesFilter
  })

  const YachtWristbandCard = ({ wristband }: { wristband: YachtWristband }) => (
    <div
      className={`cyber-bg rounded-lg p-4 hover:cyber-glow transition-all border ${getWristbandColor(wristband.wristband_type)}`}
    >
      {/* Wristband Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              wristband.status === "assigned"
                ? "bg-green-400 animate-pulse"
                : wristband.status === "maintenance"
                  ? "bg-red-400"
                  : "bg-gray-400"
            }`}
          ></div>
          <div className="flex items-center space-x-1">
            {getWristbandIcon(wristband.wristband_type)}
            <span className="cyber-green font-mono font-bold">{wristband.wristband_id}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Wifi className="h-3 w-3 cyber-green" />
          <Signal className="h-3 w-3 cyber-green" />
          <Battery className="h-3 w-3 cyber-green" />
          <span className="text-xs cyber-green">{wristband.battery_level}%</span>
        </div>
      </div>

      {/* Type Badge */}
      <div className="mb-3">
        <Badge
          variant={wristband.status === "assigned" ? "default" : "secondary"}
          className={
            wristband.wristband_type === "Owner"
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-400"
              : wristband.wristband_type === "Staff"
                ? "bg-blue-500/20 text-blue-400 border-blue-400"
                : "bg-green-500/20 text-green-400 border-green-400"
          }
        >
          {wristband.wristband_type.toUpperCase()}
        </Badge>
        <Badge variant={wristband.status === "assigned" ? "default" : "secondary"} className="ml-2">
          {wristband.status.toUpperCase()}
        </Badge>
      </div>

      {/* Guest Info */}
      {wristband.status === "assigned" && wristband.guest_name ? (
        <div className="space-y-2 mb-4">
          <p className="font-semibold cyber-green">{wristband.guest_name}</p>
          <p className="text-sm text-gray-400">{wristband.guest_email}</p>
          <p className="text-xs text-gray-500">Synced: {new Date(wristband.last_sync).toLocaleString()}</p>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-400 text-sm">Available for assignment</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {wristband.status === "available" && wristband.wristband_type !== "Owner" && (
          <div className="flex space-x-2">
            <Select value={selectedGuest} onValueChange={setSelectedGuest}>
              <SelectTrigger className="flex-1 cyber-border bg-black/50">
                <SelectValue placeholder="Select guest" />
              </SelectTrigger>
              <SelectContent>
                {availableGuests
                  .filter(
                    (guest) =>
                      (wristband.wristband_type === "Staff" && guest.guest_type === "Staff") ||
                      (wristband.wristband_type === "Guest" &&
                        guest.guest_type !== "Staff" &&
                        guest.guest_type !== "Owner"),
                  )
                  .map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {guest.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedGuest && assignWristband(wristband.id, selectedGuest)}
              disabled={!selectedGuest}
              size="sm"
              className="cyber-border bg-green-500/20 hover:bg-green-500/30"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {wristband.status === "assigned" && wristband.wristband_type !== "Owner" && (
          <Button
            onClick={() => unassignWristband(wristband.id, wristband.guest_id)}
            size="sm"
            variant="outline"
            className="w-full cyber-border"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Unassign
          </Button>
        )}

        {wristband.wristband_type === "Owner" && (
          <div className="text-center py-2">
            <p className="text-xs text-yellow-400">Owner Wristband - Permanently Assigned</p>
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
        <p className="cyber-green">Loading yacht wristband data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green text-center">🛥️ YACHT WRISTBAND MANAGEMENT</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search wristbands or guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cyber-border bg-black/50"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="cyber-border bg-black/50">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wristbands</SelectItem>
                <SelectItem value="Owner">Owner Wristbands</SelectItem>
                <SelectItem value="Guest">Guest Wristbands</SelectItem>
                <SelectItem value="Staff">Staff Wristbands</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Wristband Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredWristbands.map((wristband) => (
          <YachtWristbandCard key={wristband.id} wristband={wristband} />
        ))}
      </div>

      {filteredWristbands.length === 0 && (
        <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
          <p className="text-gray-400">No wristbands found</p>
        </div>
      )}
    </div>
  )
}
