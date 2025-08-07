"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Database, Play, Copy, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepStatus, setStepStatus] = useState<{
    [key: number]: "pending" | "success" | "error"
  }>({
    1: "pending",
    2: "pending",
    3: "pending",
  })
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testConnection = async () => {
    setIsRunning(true)
    addLog("Testing database connection...")

    try {
      const { data, error } = await supabase.auth.getUser()
      if (error && !error.message.includes("Invalid JWT")) {
        throw error
      }
      addLog("✅ Database connection successful!")
      setStepStatus((prev) => ({ ...prev, 1: "success" }))
      setCurrentStep(2)
    } catch (error) {
      addLog(`❌ Connection failed: ${error.message}`)
      setStepStatus((prev) => ({ ...prev, 1: "error" }))
    } finally {
      setIsRunning(false)
    }
  }

  const checkTables = async () => {
    setIsRunning(true)
    addLog("Checking for required tables...")

    try {
      // Check each table
      const tables = ["guests", "cabins", "wristbands", "guest_activities"]
      let allTablesExist = true

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select("*").limit(1)
          if (error) {
            addLog(`❌ Table '${table}' does not exist`)
            allTablesExist = false
          } else {
            addLog(`✅ Table '${table}' exists`)
          }
        } catch (e) {
          addLog(`❌ Table '${table}' not accessible`)
          allTablesExist = false
        }
      }

      if (allTablesExist) {
        addLog("✅ All required tables exist!")
        setStepStatus((prev) => ({ ...prev, 2: "success" }))
        setCurrentStep(3)
      } else {
        addLog("❌ Some tables are missing. Please run the SQL scripts.")
        setStepStatus((prev) => ({ ...prev, 2: "error" }))
      }
    } catch (error) {
      addLog(`❌ Error checking tables: ${error.message}`)
      setStepStatus((prev) => ({ ...prev, 2: "error" }))
    } finally {
      setIsRunning(false)
    }
  }

  const verifyData = async () => {
    setIsRunning(true)
    addLog("Verifying yacht data...")

    try {
      // Check for yacht cabins
      const { data: cabins, error: cabinError } = await supabase.from("cabins").select("*")
      if (cabinError) throw cabinError

      addLog(`Found ${cabins?.length || 0} cabins`)

      // Check for wristbands
      const { data: wristbands, error: wristbandError } = await supabase.from("wristbands").select("*")
      if (wristbandError) throw wristbandError

      addLog(`Found ${wristbands?.length || 0} wristbands`)

      // Check for owner family
      const { data: owners, error: ownerError } = await supabase.from("guests").select("*").eq("guest_type", "Owner")
      if (ownerError) throw ownerError

      addLog(`Found ${owners?.length || 0} owner family members`)

      if ((cabins?.length || 0) >= 17 && (wristbands?.length || 0) >= 40 && (owners?.length || 0) >= 6) {
        addLog("✅ Yacht data verification successful!")
        setStepStatus((prev) => ({ ...prev, 3: "success" }))
      } else {
        addLog("❌ Yacht data incomplete. Please run the population scripts.")
        setStepStatus((prev) => ({ ...prev, 3: "error" }))
      }
    } catch (error) {
      addLog(`❌ Error verifying data: ${error.message}`)
      setStepStatus((prev) => ({ ...prev, 3: "error" }))
    } finally {
      setIsRunning(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addLog("📋 SQL script copied to clipboard!")
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-400">Complete</Badge>
      case "error":
        return <Badge className="bg-red-500/20 text-red-400 border-red-400">Failed</Badge>
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
            Yacht Database Setup Wizard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1: Connection Test */}
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Test Database Connection</h3>
                  <p className="text-sm text-gray-400">Verify connection to Supabase</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(stepStatus[1])}
                <Button
                  onClick={testConnection}
                  disabled={isRunning || stepStatus[1] === "success"}
                  size="sm"
                  className="cyber-border"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </div>

            {/* Step 2: Check Tables */}
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Check Required Tables</h3>
                  <p className="text-sm text-gray-400">Verify all database tables exist</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(stepStatus[2])}
                <Button
                  onClick={checkTables}
                  disabled={isRunning || stepStatus[1] !== "success"}
                  size="sm"
                  className="cyber-border"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Check
                </Button>
              </div>
            </div>

            {/* Step 3: Verify Data */}
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Verify Yacht Data</h3>
                  <p className="text-sm text-gray-400">Check cabins, wristbands, and owner data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(stepStatus[3])}
                <Button
                  onClick={verifyData}
                  disabled={isRunning || stepStatus[2] !== "success"}
                  size="sm"
                  className="cyber-border"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SQL Scripts Section */}
      <Card className="cyber-bg cyber-border">
        <CardHeader>
          <CardTitle className="cyber-green">Manual Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-300">
              If any step fails, run these SQL scripts manually in your Supabase SQL editor:
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <h4 className="font-semibold">1. Create All Tables</h4>
                  <p className="text-sm text-gray-400">scripts/create-all-tables.sql</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard("-- Content from create-all-tables.sql")}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <h4 className="font-semibold">2. Populate Yacht Data</h4>
                  <p className="text-sm text-gray-400">scripts/populate-yacht-data.sql</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard("-- Content from populate-yacht-data.sql")}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <h4 className="font-semibold">3. Add Sample Data</h4>
                  <p className="text-sm text-gray-400">scripts/add-sample-data.sql</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard("-- Content from add-sample-data.sql")}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Section */}
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

      {/* Success Message */}
      {stepStatus[1] === "success" && stepStatus[2] === "success" && stepStatus[3] === "success" && (
        <Card className="cyber-bg border-green-500/50">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold cyber-green mb-2">Setup Complete!</h2>
            <p className="text-gray-300 mb-4">Your yacht guest tracking system is ready to use.</p>
            <Button asChild className="cyber-border bg-green-500/20 hover:bg-green-500/30">
              <a href="/">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
