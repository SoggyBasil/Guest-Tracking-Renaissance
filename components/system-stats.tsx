"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase-client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export function SystemStats() {
  const [dailyStats, setDailyStats] = useState([])
  const [wristbandStats, setWristbandStats] = useState([])
  const [cabinStats, setCabinStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch daily guest activities for the last 7 days
      const { data: activities } = await supabase
        .from("guest_activities")
        .select("created_at, activity_type")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Process daily data
      const dailyMap = new Map()
      activities?.forEach((activity) => {
        const date = new Date(activity.created_at).toLocaleDateString("en-US", { weekday: "short" })
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
      })

      const dailyChartData = Array.from(dailyMap.entries()).map(([day, count]) => ({
        day,
        activities: count,
      }))

      setDailyStats(dailyChartData)

      // Fetch wristband status distribution
      const { data: wristbands } = await supabase.from("wristbands").select("status")

      const wristbandMap = new Map()
      wristbands?.forEach((wb) => {
        wristbandMap.set(wb.status, (wristbandMap.get(wb.status) || 0) + 1)
      })

      const wristbandChartData = Array.from(wristbandMap.entries()).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: status === "assigned" ? "#00ff80" : status === "maintenance" ? "#ff4444" : "#888888",
      }))

      setWristbandStats(wristbandChartData)

      // Fetch cabin occupancy
      const { data: cabins } = await supabase.from("cabins").select("status")

      const cabinMap = new Map()
      cabins?.forEach((cabin) => {
        cabinMap.set(cabin.status, (cabinMap.get(cabin.status) || 0) + 1)
      })

      const cabinChartData = Array.from(cabinMap.entries()).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: status === "occupied" ? "#ff0080" : status === "available" ? "#00ff80" : "#ffaa00",
      }))

      setCabinStats(cabinChartData)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="cyber-bg cyber-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
        <p className="cyber-green">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Daily Activities Chart */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green">Daily Activities (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#00ff80" />
                <YAxis stroke="#00ff80" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#000",
                    border: "1px solid #00ff80",
                    borderRadius: "8px",
                    color: "#00ff80",
                  }}
                />
                <Bar dataKey="activities" fill="#00ff80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wristband Status Distribution */}
        <Card className="cyber-bg cyber-border">
          <CardHeader>
            <CardTitle className="cyber-green">Wristband Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wristbandStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {wristbandStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000",
                      border: "1px solid #00ff80",
                      borderRadius: "8px",
                      color: "#00ff80",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cabin Occupancy */}
        <Card className="cyber-bg cyber-border">
          <CardHeader>
            <CardTitle className="cyber-green">Cabin Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cabinStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {cabinStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#000",
                      border: "1px solid #00ff80",
                      borderRadius: "8px",
                      color: "#00ff80",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Performance Metrics */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green">System Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold cyber-green mb-2">99.9%</div>
              <div className="text-sm text-gray-400">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold cyber-green mb-2">0.2s</div>
              <div className="text-sm text-gray-400">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold cyber-green mb-2">24/7</div>
              <div className="text-sm text-gray-400">Monitoring Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold cyber-green mb-2">100%</div>
              <div className="text-sm text-gray-400">Data Sync Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green">Recent System Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm">Wristband WB001 assigned to guest</span>
              <span className="text-xs text-gray-400">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm">Cabin C003 allocated</span>
              <span className="text-xs text-gray-400">5 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm">Guest check-in completed</span>
              <span className="text-xs text-gray-400">8 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm">System backup completed</span>
              <span className="text-xs text-gray-400">1 hour ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
