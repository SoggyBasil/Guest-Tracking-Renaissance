"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Crown, Users, Bed } from "lucide-react"
import { CabinAssignmentDialog } from "@/components/cabin-assignment-dialog"

interface Guest {
  id: string
  name: string
  guest_type: string
  allergies?: string
  special_requests?: string
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

interface YachtCabinLayoutProps {
  cabins: Cabin[]
  onCabinClick?: (cabin: Cabin) => void
}

export function YachtCabinLayout({ cabins, onCabinClick }: YachtCabinLayoutProps) {
  const [collapsedDecks, setCollapsedDecks] = useState<Set<string>>(new Set())
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)

  // State management

  const toggleDeck = (deck: string) => {
    setCollapsedDecks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deck)) {
        newSet.delete(deck)
      } else {
        newSet.add(deck)
      }
      return newSet
    })
  }

  const getCabinByNumber = (cabinNumber: string) => {
    return cabins.find(cabin => cabin.cabin_number === cabinNumber)
  }

  const getCabinStatusColor = (cabin: Cabin | undefined) => {
    if (!cabin) return "bg-gray-500"
    if (cabin.guest_id_1 || cabin.guest_id_2) return "bg-green-500"
    return "bg-blue-500"
  }

  const getCabinStatusText = (cabin: Cabin | undefined) => {
    if (!cabin) return "Unknown"
    if (cabin.guest_id_1 || cabin.guest_id_2) return "Occupied"
    return "Available"
  }

  const getCabinOccupancyText = (cabin: Cabin | undefined) => {
    if (!cabin) return ""
    if (cabin.guest_id_1 && cabin.guest_id_2) return "2/2 Guests"
    if (cabin.guest_id_1 || cabin.guest_id_2) return "1/2 Guests"
    return "0/2 Guests"
  }

  const getCabinTypeIcon = (cabinType: string) => {
    switch (cabinType) {
      case "Master Suite":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "VIP Cabin":
        return <Users className="h-4 w-4 text-purple-500" />
      case "Staff Cabin":
        return <Users className="h-4 w-4 text-blue-500" />
      default:
        return <Bed className="h-4 w-4 text-gray-500" />
    }
  }

  const handleCabinClick = (cabin: Cabin) => {
    setSelectedCabin(cabin)
    setAssignmentDialogOpen(true)
    // Don't call onCabinClick here as it might interfere with the dialog state
  }

  const handleAssignmentComplete = () => {
    // Trigger a refresh of the cabin data
    // This will be handled by the parent component
    onCabinClick?.(selectedCabin!)
    // Reset the dialog state
    setSelectedCabin(null)
    setAssignmentDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* OWNERS DECK */}
      <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/30 rounded-lg">
        <button
          onClick={() => toggleDeck('OWNERS DECK')}
          className="w-full p-4 flex items-center justify-between hover:bg-yellow-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-yellow-400">OWNERS DECK</h2>
            <Badge variant="outline" className="border-yellow-400 text-yellow-400">
              Master Suite
            </Badge>
          </div>
          {collapsedDecks.has('OWNERS DECK') ? (
            <ChevronRight className="h-6 w-6 text-yellow-400" />
          ) : (
            <ChevronDown className="h-6 w-6 text-yellow-400" />
          )}
        </button>
        
        {!collapsedDecks.has('OWNERS DECK') && (
          <div className="p-4 border-t border-yellow-500/30">
            {/* Master Suite - Centered and prominent */}
            <div className="flex justify-center">
              <Card 
                className={`w-80 cursor-pointer transition-all hover:scale-105 ${
                  getCabinByNumber('602')?.guest_id_1 || getCabinByNumber('602')?.guest_id_2 ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => handleCabinClick(getCabinByNumber('602')!)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-yellow-600">602 - Master Suite</CardTitle>
                    <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('602'))}`} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {getCabinTypeIcon('Master Suite')}
                    <span>Master Suite</span>
                    <span>•</span>
                    <span>{getCabinOccupancyText(getCabinByNumber('602'))}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={getCabinByNumber('602')?.guest_id_1 || getCabinByNumber('602')?.guest_id_2 ? "default" : "secondary"}>
                        {getCabinStatusText(getCabinByNumber('602'))}
                      </Badge>
                    </div>
                    {(getCabinByNumber('602')?.guest_1 || getCabinByNumber('602')?.guest_2) && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {getCabinByNumber('602')?.guest_1 && (
                          <div>Guest 1: {getCabinByNumber('602')?.guest_1?.name} ({getCabinByNumber('602')?.guest_1?.guest_type})</div>
                        )}
                        {getCabinByNumber('602')?.guest_2 && (
                          <div>Guest 2: {getCabinByNumber('602')?.guest_2?.name} ({getCabinByNumber('602')?.guest_2?.guest_type})</div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* SPA DECK */}
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-500/30 rounded-lg">
        <button
          onClick={() => toggleDeck('SPA DECK')}
          className="w-full p-4 flex items-center justify-between hover:bg-purple-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-bold text-purple-400">SPA DECK</h2>
            <Badge variant="outline" className="border-purple-400 text-purple-400">
              VIP Cabins
            </Badge>
          </div>
          {collapsedDecks.has('SPA DECK') ? (
            <ChevronRight className="h-6 w-6 text-purple-400" />
          ) : (
            <ChevronDown className="h-6 w-6 text-purple-400" />
          )}
        </button>
        
        {!collapsedDecks.has('SPA DECK') && (
          <div className="p-4 border-t border-purple-500/30">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-4">
                {/* 503 - DUBAI */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('503')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('503')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">503 - DUBAI</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('503'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('VIP Cabin')}
                      <span>VIP Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('503')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('503'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('503')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('503')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 505 - NEW YORK */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('505')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('505')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">505 - NEW YORK</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('505'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('VIP Cabin')}
                      <span>VIP Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('505')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('505'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('505')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('505')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 507 - ROME */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('507')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('507')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">507 - ROME</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('507'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('VIP Cabin')}
                      <span>VIP Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('507')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('507'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('507')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('507')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side */}
              <div className="space-y-4">
                {/* 504 - MIAMI */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('504')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('504')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">504 - MIAMI</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('504'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('VIP Cabin')}
                      <span>VIP Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('504')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('504'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('504')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('504')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 502 - SYDNEY */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('502')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('502')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">502 - SYDNEY</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('502'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('VIP Cabin')}
                      <span>VIP Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('502')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('502'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('502')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('502')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 506 - PARIS */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('506')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('506')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">506 - PARIS</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('506'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('VIP Cabin')}
                      <span>VIP Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('506')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('506'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('506')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('506')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 510 - TOKYO */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('510')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('510')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">510 - TOKYO</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('510'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Staff Cabin')}
                      <span>Staff Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('510')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('510'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('510')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('510')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPPER DECK */}
      <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/30 rounded-lg">
        <button
          onClick={() => toggleDeck('UPPER DECK')}
          className="w-full p-4 flex items-center justify-between hover:bg-blue-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bed className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-blue-400">UPPER DECK</h2>
            <Badge variant="outline" className="border-blue-400 text-blue-400">
              Guest & Staff Cabins
            </Badge>
          </div>
          {collapsedDecks.has('UPPER DECK') ? (
            <ChevronRight className="h-6 w-6 text-blue-400" />
          ) : (
            <ChevronDown className="h-6 w-6 text-blue-400" />
          )}
        </button>
        
        {!collapsedDecks.has('UPPER DECK') && (
          <div className="p-4 border-t border-blue-500/30">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="space-y-4">
                {/* 403 - BEIJING */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('403')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('403')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">403 - BEIJING</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('403'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Staff Cabin')}
                      <span>Staff Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('403')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('403'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('403')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('403')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 407 - MADRID */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('407')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('407')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">407 - MADRID</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('407'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('407')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('407'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('407')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('407')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 409 - MONACO */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('409')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('409')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">409 - MONACO</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('409'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('409')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('409'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('409')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('409')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 411 - RIO */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('411')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('411')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">411 - RIO</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('411'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('411')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('411'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('411')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('411')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 413 - VENICE */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('413')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('413')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">413 - VENICE</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('413'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('413')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('413'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('413')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('413')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side */}
              <div className="space-y-4">
                {/* 404 - ISTANBUL */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('404')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('404')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">404 - ISTANBUL</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('404'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Staff Cabin')}
                      <span>Staff Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('404')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('404'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('404')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('404')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 408 - CAIRO */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('408')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('408')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">408 - CAIRO</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('408'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('408')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('408'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('408')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('408')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 410 - HOLLYWOOD */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('410')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('410')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">410 - HOLLYWOOD</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('410'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('410')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('410'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('410')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('410')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 412 - LONDON */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('412')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('412')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">412 - LONDON</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('412'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('412')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('412'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('412')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('412')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 414 - MYKONOS */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('414')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('414')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">414 - MYKONOS</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('414'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Guest Cabin')}
                      <span>Guest Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('414')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('414'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('414')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('414')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 418 - CAPRI */}
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    getCabinByNumber('418')?.guest_id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleCabinClick(getCabinByNumber('418')!)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">418 - CAPRI</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${getCabinStatusColor(getCabinByNumber('418'))}`} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getCabinTypeIcon('Staff Cabin')}
                      <span>Staff Cabin</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={getCabinByNumber('418')?.guest_id ? "default" : "secondary"}>
                          {getCabinStatusText(getCabinByNumber('418'))}
                        </Badge>
                      </div>
                      {getCabinByNumber('418')?.guest && (
                        <div className="text-sm text-gray-600">
                          <div>Guest: {getCabinByNumber('418')?.guest?.name}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cabin Assignment Dialog */}
      <CabinAssignmentDialog
        cabin={selectedCabin}
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        onAssignmentComplete={handleAssignmentComplete}
      />
      

    </div>
  )
}
