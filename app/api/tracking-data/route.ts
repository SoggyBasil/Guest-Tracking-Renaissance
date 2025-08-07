import { NextResponse } from 'next/server'

export async function GET() {
  // Mock tracking data with some offline devices
  const mockData = {
    Tracks: [
      // Online devices
      {
        Name: "G1 602",
        Room: "Cabin 602 - Master Suite",
        Message: "Cabin 602 - Master Suite",
        Value: -45,
        Tracked: true,
        OnBoard: true
      },
      {
        Name: "G2 603", 
        Room: "Cabin 603 - VIP Suite",
        Message: "Cabin 603 - VIP Suite",
        Value: -52,
        Tracked: true,
        OnBoard: true
      },
      {
        Name: "P1 604",
        Room: "Cabin 604 - Family Suite", 
        Message: "Cabin 604 - Family Suite",
        Value: -38,
        Tracked: true,
        OnBoard: true
      },
      // Offline devices
      {
        Name: "G3 605",
        Room: "Unknown Location",
        Message: "Unknown Location", 
        Value: 0,
        Tracked: false,
        OnBoard: false
      },
      {
        Name: "C1 606",
        Room: "Unknown Location",
        Message: "Unknown Location",
        Value: 0, 
        Tracked: false,
        OnBoard: false
      },
      {
        Name: "G4 607",
        Room: "Cabin 607 - Guest Room",
        Message: "Cabin 607 - Guest Room",
        Value: -85, // Very weak signal
        Tracked: true,
        OnBoard: true
      }
    ]
  }

  return NextResponse.json(mockData)
}
