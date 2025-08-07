"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { YachtWristbandManager } from "./yacht-wristband-manager"
import { GuestTracker } from "./guest-tracker"
import { YachtCabinLayout } from "./yacht-cabin-layout"
import { SystemStats } from "./system-stats"
import { Users, Bed, Activity, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export function CyberDashboard() {
  const [stats, setStats] = useState({
    totalGuests: 0,
    activeGuests: 0,
    occupiedCabins: 0,
    assignedWristbands: 0,
  })

  useEffect(() => {
    fetchStats()

    // Set up real-time subscriptions
    const subscription = supabase
      .channel("dashboard_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "cabins" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "wristbands" }, fetchStats)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchStats = async () => {
    try {
      // Get total guests
      const { count: totalGuests } = await supabase.from("guests").select("*", { count: "exact", head: true })

      // Get active guests (assuming you have a status field)
      const { count: activeGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .neq("status", "inactive")

      // Get occupied cabins
      const { count: occupiedCabins } = await supabase
        .from("cabins")
        .select("*", { count: "exact", head: true })
        .eq("status", "occupied")

      // Get assigned wristbands
      const { count: assignedWristbands } = await supabase
        .from("wristbands")
        .select("*", { count: "exact", head: true })
        .eq("status", "assigned")

      setStats({
        totalGuests: totalGuests || 0,
        activeGuests: activeGuests || 0,
        occupiedCabins: occupiedCabins || 0,
        assignedWristbands: assignedWristbands || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold cyber-green mb-2">GUEST.SYS v2.0</h1>
          <p className="text-gray-400">Advanced Guest Tracking & Wristband Management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="cyber-bg cyber-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">TOTAL GUESTS</p>
                <p className="text-3xl font-bold cyber-green">{stats.totalGuests}</p>
              </div>
              <Users className="h-8 w-8 cyber-green" />
            </div>
          </div>

          <div className="cyber-bg cyber-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">ACTIVE GUESTS</p>
                <p className="text-3xl font-bold cyber-green">{stats.activeGuests}</p>
              </div>
              <Activity className="h-8 w-8 cyber-green" />
            </div>
          </div>

          <div className="cyber-bg cyber-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">OCCUPIED CABINS</p>
                <p className="text-3xl font-bold cyber-green">{stats.occupiedCabins}</p>
              </div>
              <Bed className="h-8 w-8 cyber-green" />
            </div>
          </div>

          <div className="cyber-bg cyber-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">WRISTBANDS ACTIVE</p>
                <p className="text-3xl font-bold cyber-green">{stats.assignedWristbands}</p>
              </div>
              <Zap className="h-8 w-8 cyber-green" />
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="wristbands" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 cyber-bg cyber-border">
            <TabsTrigger value="wristbands" className="data-[state=active]:cyber-green data-[state=active]:cyber-glow">
              Wristbands
            </TabsTrigger>
            <TabsTrigger value="guests" className="data-[state=active]:cyber-green data-[state=active]:cyber-glow">
              Guests
            </TabsTrigger>
            <TabsTrigger value="cabins" className="data-[state=active]:cyber-green data-[state=active]:cyber-glow">
              Cabins
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:cyber-green data-[state=active]:cyber-glow">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wristbands">
            <YachtWristbandManager />
          </TabsContent>

          <TabsContent value="guests">
            <GuestTracker />
          </TabsContent>

          <TabsContent value="cabins">
            <YachtCabinLayout />
          </TabsContent>

          <TabsContent value="stats">
            <SystemStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
