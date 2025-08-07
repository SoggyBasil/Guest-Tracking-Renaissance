"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, Eye, LogOut, LogIn } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface Guest {
  id: string
  name: string
  email: string
  phone?: string
  status?: string
  created_at: string
  wristband_id?: string
  cabin_number?: string
}

export function GuestTracker() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchGuests()

    // Real-time subscription
    const subscription = supabase
      .channel("guest_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, fetchGuests)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from("guests")
        .select(`
          *,
          wristbands (
            wristband_id
          ),
          cabins (
            cabin_number
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const guestsWithDetails =
        data?.map((guest) => ({
          ...guest,
          wristband_id: guest.wristbands?.[0]?.wristband_id,
          cabin_number: guest.cabins?.[0]?.cabin_number,
        })) || []

      setGuests(guestsWithDetails)
    } catch (error) {
      console.error("Error fetching guests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGuest = async (formData: FormData) => {
    try {
      const guestData = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        status: "active",
      }

      const { error } = await supabase.from("guests").insert([guestData])

      if (error) throw error

      setShowAddForm(false)
      fetchGuests()
    } catch (error) {
      console.error("Error adding guest:", error)
    }
  }

  const filteredGuests = guests.filter(
    (guest) =>
      guest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status?: string) => {
    const isActive = status !== "inactive"
    return (
      <Badge
        variant={isActive ? "default" : "secondary"}
        className={
          isActive ? "bg-green-500/20 text-green-400 border-green-400" : "bg-gray-500/20 text-gray-400 border-gray-400"
        }
      >
        {isActive ? (
          <>
            <LogIn className="h-3 w-3 mr-1" />
            Active
          </>
        ) : (
          <>
            <LogOut className="h-3 w-3 mr-1" />
            Inactive
          </>
        )}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
        <p className="cyber-green">Loading guest data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="cyber-green">Guest Management System</CardTitle>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="cyber-border bg-green-500/20 hover:bg-green-500/30"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-border bg-black/50"
            />
          </div>
        </CardHeader>

        {showAddForm && (
          <CardContent className="border-t border-green-500/30">
            <form action={handleAddGuest} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name" className="cyber-green">
                  Name
                </Label>
                <Input name="name" required className="cyber-border bg-black/50" />
              </div>
              <div>
                <Label htmlFor="email" className="cyber-green">
                  Email
                </Label>
                <Input name="email" type="email" required className="cyber-border bg-black/50" />
              </div>
              <div>
                <Label htmlFor="phone" className="cyber-green">
                  Phone
                </Label>
                <Input name="phone" className="cyber-border bg-black/50" />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" className="cyber-border bg-green-500/20 hover:bg-green-500/30">
                  Add Guest
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Guest List */}
      <Card className="cyber-bg cyber-border">
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-green-500/30">
                  <TableHead className="cyber-green">Status</TableHead>
                  <TableHead className="cyber-green">Name</TableHead>
                  <TableHead className="cyber-green">Email</TableHead>
                  <TableHead className="cyber-green">Wristband</TableHead>
                  <TableHead className="cyber-green">Cabin</TableHead>
                  <TableHead className="cyber-green">Check-in</TableHead>
                  <TableHead className="cyber-green">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => (
                  <TableRow key={guest.id} className="border-green-500/20">
                    <TableCell>{getStatusBadge(guest.status)}</TableCell>
                    <TableCell className="font-medium">{guest.name}</TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>
                      {guest.wristband_id ? (
                        <Badge variant="outline" className="cyber-border">
                          {guest.wristband_id}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {guest.cabin_number ? (
                        <Badge variant="outline" className="cyber-border">
                          {guest.cabin_number}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(guest.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="cyber-border bg-transparent">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredGuests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No guests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
