"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Database, Play } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export function DatabaseSetupHelper() {
  const [setupStatus, setSetupStatus] = useState<{
    cabins: "pending" | "success" | "error"
    wristbands: "pending" | "success" | "error"
    guests: "pending" | "success" | "error"
  }>({
    cabins: "pending",
    wristbands: "pending",
    guests: "pending",
  })
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runSetup = async () => {
    setIsRunning(true)
    setLogs([])
    addLog("Starting yacht database setup...")

    try {
      // Step 1: Create cabins table and data
      addLog("Creating cabins table...")
      const { error: cabinsError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS cabins (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            cabin_number VARCHAR(10) UNIQUE NOT NULL,
            cabin_name VARCHAR(50),
            capacity INTEGER DEFAULT 2,
            deck VARCHAR(50),
            cabin_type VARCHAR(50),
            position VARCHAR(20),
            status VARCHAR(20) DEFAULT 'available',
            guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      })

      if (cabinsError) {
        // Try alternative approach - direct insert
        addLog("Using direct table creation approach...")

        // Check if cabins table exists
        const { data: tableCheck } = await supabase.from("cabins").select("*").limit(1)

        if (!tableCheck) {
          addLog("Cabins table doesn't exist. Please run the SQL script manually.")
          setSetupStatus((prev) => ({ ...prev, cabins: "error" }))
        } else {
          addLog("Cabins table exists!")
          setSetupStatus((prev) => ({ ...prev, cabins: "success" }))
        }
      } else {
        addLog("Cabins table created successfully!")
        setSetupStatus((prev) => ({ ...prev, cabins: "success" }))
      }

      // Step 2: Insert cabin data
      addLog("Inserting yacht cabin data...")
      const cabinData = [
        {
          cabin_number: "602",
          cabin_name: "Master Suite",
          deck: "OWNERS DECK",
          cabin_type: "Master Suite",
          position: "center",
        },
        { cabin_number: "503", cabin_name: "DUBAI", deck: "SPA DECK", cabin_type: "VIP Cabin", position: "left" },
        { cabin_number: "504", cabin_name: "NEW YORK", deck: "SPA DECK", cabin_type: "VIP Cabin", position: "right" },
        // Add more cabin data...
      ]

      const { error: insertError } = await supabase.from("cabins").upsert(cabinData)

      if (insertError) {
        addLog(`Error inserting cabin data: ${insertError.message}`)
      } else {
        addLog("Cabin data inserted successfully!")
      }

      // Step 3: Check wristbands
      addLog("Checking wristbands table...")
      const { data: wristbandCheck } = await supabase.from("wristbands").select("*").limit(1)

      if (wristbandCheck !== null) {
        addLog("Wristbands table exists!")
        setSetupStatus((prev) => ({ ...prev, wristbands: "success" }))
      } else {
        addLog("Wristbands table needs setup")
        setSetupStatus((prev) => ({ ...prev, wristbands: "error" }))
      }

      // Step 4: Check guests
      addLog("Checking guests table...")
      const { data: guestCheck } = await supabase.from("guests").select("*").limit(1)

      if (guestCheck !== null) {
        addLog("Guests table exists!")
        setSetupStatus((prev) => ({ ...prev, guests: "success" }))
      } else {
        addLog("Guests table needs setup")
        setSetupStatus((prev) => ({ ...prev, guests: "error" }))
      }

      addLog("Setup process completed!")
    } catch (error) {
      addLog(`Setup failed: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-400">Ready</Badge>
      case "error":
        return <Badge className="bg-red-500/20 text-red-400 border-red-400">Error</Badge>
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400">Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green flex items-center gap-2">
            <Database className="h-5 w-5" />
            Yacht Database Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(setupStatus.cabins)}
                <span>Cabins Table</span>
              </div>
              {getStatusBadge(setupStatus.cabins)}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(setupStatus.wristbands)}
                <span>Wristbands Table</span>
              </div>
              {getStatusBadge(setupStatus.wristbands)}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(setupStatus.guests)}
                <span>Guests Table</span>
              </div>
              {getStatusBadge(setupStatus.guests)}
            </div>

            <Button
              onClick={runSetup}
              disabled={isRunning}
              className="w-full cyber-border bg-green-500/20 hover:bg-green-500/30"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Running Setup..." : "Run Database Setup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card className="cyber-bg cyber-border">
          <CardHeader>
            <CardTitle className="cyber-green">Setup Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 p-4 rounded-lg max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm text-green-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green">Manual Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-gray-300">
              If the automatic setup fails, please run these SQL scripts manually in your Supabase SQL editor:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>
                Run <code className="bg-gray-800 px-2 py-1 rounded">scripts/create-yacht-tables.sql</code>
              </li>
              <li>
                Run <code className="bg-gray-800 px-2 py-1 rounded">scripts/add-sample-guests.sql</code>
              </li>
              <li>Refresh this page to test the connection</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
