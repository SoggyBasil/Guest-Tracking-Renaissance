"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, UserPlus, Eye, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export function AdaptiveGuestTracker() {
  const [guests, setGuests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [tableStructure, setTableStructure] = useState<any>(null)

  useEffect(() => {
    discoverTableStructure()
  }, [])

  const discoverTableStructure = async () => {
    try {
      // Try common table names and structures
      const possibleTables = ["guests", "guest", "users", "visitors", "profiles", "accounts"]
      let foundTable = null
      let foundData = null
      let allFields = []

      for (const tableName of possibleTables) {
        try {
          // Try to get a few records to understand the structure better
          const { data, error } = await supabase.from(tableName).select("*").limit(3)

          if (!error && data && data.length > 0) {
            foundTable = tableName
            foundData = data[0]

            // Get all unique fields from the sample data
            const fieldSet = new Set()
            data.forEach((record) => {
              Object.keys(record).forEach((key) => fieldSet.add(key))
            })
            allFields = Array.from(fieldSet)

            console.log(`✅ Found table: ${tableName} with fields:`, allFields)
            break
          }
        } catch (e) {
          console.log(`❌ Table ${tableName} not accessible`)
          // Continue to next table
        }
      }

      if (foundTable && foundData) {
        setTableStructure({
          tableName: foundTable,
          fields: allFields,
          sampleData: foundData,
        })
        await fetchGuests(foundTable)
      } else {
        setError(
          `Could not find a guests table. Tried: ${possibleTables.join(", ")}. Please check your database structure or create a 'guests' table.`,
        )
      }
    } catch (error) {
      console.error("Error discovering table structure:", error)
      setError("Failed to connect to database: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGuests = async (tableName: string) => {
    try {
      const { data, error } = await supabase.from(tableName).select("*").order("created_at", { ascending: false })

      if (error) throw error
      setGuests(data || [])
    } catch (error) {
      console.error("Error fetching guests:", error)
      setError("Failed to fetch guest data")
    }
  }

  const handleAddGuest = async (formData: FormData) => {
    if (!tableStructure) return

    try {
      const guestData: any = {}

      // Map form data to database fields
      const formFields = ["name", "email", "phone"]
      formFields.forEach((field) => {
        const value = formData.get(field)
        if (value) guestData[field] = value
      })

      // Add timestamp if the field exists
      if (tableStructure.fields.includes("created_at")) {
        guestData.created_at = new Date().toISOString()
      }
      if (tableStructure.fields.includes("checkin_time")) {
        guestData.checkin_time = new Date().toISOString()
      }

      // Set status if field exists
      if (tableStructure.fields.includes("status")) {
        guestData.status = "active"
      }

      const { error } = await supabase.from(tableStructure.tableName).insert([guestData])

      if (error) throw error

      setShowAddForm(false)
      await fetchGuests(tableStructure.tableName)
    } catch (error) {
      console.error("Error adding guest:", error)
    }
  }

  const filteredGuests = guests.filter((guest) => {
    const searchableFields = ["name", "email", "phone"]
    return searchableFields.some((field) => guest[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  })

  if (loading) {
    return (
      <Card className="cyber-card">
        <CardContent className="flex items-center justify-center h-64">
          <div className="cyber-text">Discovering database structure...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="cyber-card">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-2">{error}</p>
            <Button onClick={discoverTableStructure} variant="outline">
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Database Info */}
      {tableStructure && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="cyber-text">Database Connection Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Table:</strong> {tableStructure.tableName}
              </div>
              <div>
                <strong>Fields:</strong> {tableStructure.fields.join(", ")}
              </div>
              <div>
                <strong>Records:</strong> {guests.length}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tracker */}
      <Card className="cyber-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="cyber-text">Guest Tracking System</CardTitle>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="cyber-border bg-cyber-green/20 hover:bg-cyber-green/30"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-border bg-background/50"
            />
          </div>
        </CardHeader>

        {showAddForm && (
          <CardContent className="border-t border-cyber-green/30">
            <form action={handleAddGuest} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input name="name" required className="cyber-border bg-background/50" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" required className="cyber-border bg-background/50" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input name="phone" className="cyber-border bg-background/50" />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" className="cyber-border bg-cyber-green/20 hover:bg-cyber-green/30">
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
      <Card className="cyber-card">
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-cyber-green/30">
                  {tableStructure?.fields.slice(0, 6).map((field: string) => (
                    <TableHead key={field} className="cyber-text capitalize">
                      {field.replace("_", " ")}
                    </TableHead>
                  ))}
                  <TableHead className="cyber-text">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest, index) => (
                  <TableRow key={guest.id || index} className="border-cyber-green/20">
                    {tableStructure?.fields.slice(0, 6).map((field: string) => (
                      <TableCell key={field}>
                        {field.includes("time") || field.includes("date")
                          ? new Date(guest[field]).toLocaleString()
                          : guest[field]?.toString() || "-"}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="outline" size="sm">
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
              <p className="text-muted-foreground">No guests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
