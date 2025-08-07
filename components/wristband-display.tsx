"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Wifi, Battery, Signal } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Guest {
  id: string
  name: string
  email: string
  phone: string
  cabin_number?: string
  status: "active" | "inactive"
  created_at: string
  wristband_id?: string
}

export function WristbandDisplay() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGuests()

    // Set up real-time subscription
    const subscription = supabase
      .channel("guests_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => fetchGuests())
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchGuests = async () => {
    try {
      // Adjust the query to match your existing table structure
      const { data, error } = await supabase
        .from("guests")
        .select(`
          *,
          cabins!inner(
            cabin_number,
            id
          )
        `)
        .eq("status", "active") // or your equivalent active status
        .order("created_at", { ascending: false })

      if (error) throw error

      const guestsWithCabins =
        data?.map((guest) => ({
          ...guest,
          cabin_number: guest.cabins?.cabin_number,
        })) || []

      setGuests(guestsWithCabins)
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGuests = guests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guest.cabin_number && guest.cabin_number.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const WristbandCard = ({ guest }: { guest: Guest }) => (
    <Card className="wristband p-4 hover:scale-105 transition-transform duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-cyber-green rounded-full animate-pulse"></div>
          <span className="text-xs cyber-text font-mono">ID: {guest.wristband_id || guest.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Wifi className="h-3 w-3 cyber-text" />
          <Signal className="h-3 w-3 cyber-text" />
          <Battery className="h-3 w-3 cyber-text" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-lg cyber-text truncate">{guest.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{guest.email}</p>

        <div className="flex items-center justify-between">
          <Badge variant={guest.cabin_number ? "default" : "secondary"} className="cyber-border">
            {guest.cabin_number ? `Cabin ${guest.cabin_number}` : "No Cabin"}
          </Badge>
          <Badge variant="outline" className="cyber-border">
            Active
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">Check-in: {new Date(guest.created_at).toLocaleString()}</div>
      </div>

      <div className="mt-3 pt-3 border-t border-cyber-green/30">
        <div className="flex justify-between text-xs">
          <span className="cyber-text">STATUS: ACTIVE</span>
          <span className="cyber-text">SIGNAL: STRONG</span>
        </div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <Card className="cyber-card">
        <CardContent className="flex items-center justify-center h-64">
          <div className="cyber-text">Loading wristband data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="cyber-text">Active Wristbands</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests, emails, or cabin numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-border bg-background/50"
            />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGuests.map((guest) => (
          <WristbandCard key={guest.id} guest={guest} />
        ))}
      </div>

      {filteredGuests.length === 0 && (
        <Card className="cyber-card">
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground">No active wristbands found</p>
              {searchTerm && (
                <Button variant="ghost" onClick={() => setSearchTerm("")} className="mt-2 cyber-text">
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
