"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const dailyVisits = [
  { day: "Mon", visits: 45 },
  { day: "Tue", visits: 52 },
  { day: "Wed", visits: 38 },
  { day: "Thu", visits: 61 },
  { day: "Fri", visits: 55 },
  { day: "Sat", visits: 23 },
  { day: "Sun", visits: 18 },
]

const monthlyTrend = [
  { month: "Jan", visits: 1200 },
  { month: "Feb", visits: 1100 },
  { month: "Mar", visits: 1350 },
  { month: "Apr", visits: 1280 },
  { month: "May", visits: 1420 },
  { month: "Jun", visits: 1380 },
]

const purposeData = [
  { name: "Meeting", value: 45, color: "#0088FE" },
  { name: "Interview", value: 25, color: "#00C49F" },
  { name: "Delivery", value: 20, color: "#FFBB28" },
  { name: "Maintenance", value: 10, color: "#FF8042" },
]

export function GuestStats() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Daily Visits This Week</CardTitle>
          <CardDescription>Number of guests per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyVisits}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="visits" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>Guest visits over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visit Purposes</CardTitle>
          <CardDescription>Distribution of visit purposes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={purposeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {purposeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Average daily visits</span>
            <span className="text-2xl font-bold">42</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Peak visit time</span>
            <span className="text-2xl font-bold">2 PM</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Most common purpose</span>
            <span className="text-lg font-semibold">Meeting</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Average visit duration</span>
            <span className="text-2xl font-bold">2.4h</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
