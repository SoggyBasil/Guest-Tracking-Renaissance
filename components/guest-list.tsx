"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Clock, CheckCircle, XCircle, Eye } from "lucide-react"

// Mock data
const guests = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    company: "Acme Corp",
    checkIn: "2024-01-15 09:30",
    checkOut: null,
    purpose: "Meeting",
    host: "Jane Smith",
    status: "checked-in",
  },
  {
    id: 2,
    name: "Sarah Wilson",
    email: "sarah@techco.com",
    company: "TechCo",
    checkIn: "2024-01-15 10:15",
    checkOut: "2024-01-15 12:30",
    purpose: "Interview",
    host: "Mike Johnson",
    status: "checked-out",
  },
  {
    id: 3,
    name: "Robert Brown",
    email: "robert@startup.io",
    company: "StartupIO",
    checkIn: "2024-01-15 11:00",
    checkOut: null,
    purpose: "Delivery",
    host: "Lisa Davis",
    status: "checked-in",
  },
]

export function GuestList() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredGuests = guests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.company.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked-in":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Checked In
          </Badge>
        )
      case "checked-out":
        return <Badge variant="secondary">Checked Out</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "checked-in":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "checked-out":
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest List</CardTitle>
        <CardDescription>View and manage all guests in the system</CardDescription>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(guest.status)}
                    {getStatusBadge(guest.status)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{guest.name}</TableCell>
                <TableCell>{guest.company}</TableCell>
                <TableCell>{guest.purpose}</TableCell>
                <TableCell>{guest.host}</TableCell>
                <TableCell>{guest.checkIn}</TableCell>
                <TableCell>{guest.checkOut || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {guest.status === "checked-in" && (
                      <Button variant="outline" size="sm">
                        Check Out
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
