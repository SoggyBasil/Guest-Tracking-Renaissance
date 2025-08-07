"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export function CyberStats() {
  const [dailyStats, setDailyStats] = useState([])
  const [occupancyStats, setOccupancyStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch daily check-ins for the last 7 days
      const { data: dailyData } = await supabase
        .from("guests")
        .select("created_at") // or checkin_time field
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Process daily data
      const dailyMap = new Map()
      dailyData?.forEach((guest) => {
        const date = new Date(guest.created_at).toLocaleDateString("en-US", { weekday: "short" })
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
      })

      const dailyChartData = Array.from(dailyMap.entries()).map(([day, count]) => ({
        day,
        checkins: count,
      }))

      setDailyStats(dailyChartData)

      // Fetch occupancy data
      const { data: occupancyData } = await supabase.from("cabins").select("guest_id")

      const totalCabins = 20
      const occupiedCabins = occupancyData?.filter((cabin) => cabin.guest_id).length || 0
      const availableCabins = totalCabins - occupiedCabins

      setOccupancyStats([
        { name: "Occupied", value: occupiedCabins, color: "#ff0080" },
        { name: "Available", value: availableCabins, color: "#00ff80" },
      ])
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="cyber-card">
        <CardContent className="flex items-center justify-center h-64">
          <div className="cyber-text">Loading analytics...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="cyber-text">Daily Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cyber-green) / 0.2)" />
              <XAxis dataKey="day" stroke="hsl(var(--cyber-green))" />
              <YAxis stroke="hsl(var(--cyber-green))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--cyber-green))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="checkins" fill="hsl(var(--cyber-green))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="cyber-text">Cabin Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={occupancyStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {occupancyStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--cyber-green))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="cyber-card md:col-span-2">
        <CardHeader>
          <CardTitle className="cyber-text">System Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold cyber-text">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold cyber-text">0.2s</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold cyber-text">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold cyber-text">100%</div>
              <div className="text-sm text-muted-foreground">Data Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
