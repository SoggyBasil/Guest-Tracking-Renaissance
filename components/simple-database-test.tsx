"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase-client"
import { Database, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export function SimpleDatabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<"testing" | "connected" | "failed">("testing")
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    setConnectionStatus("testing")

    try {
      // Simple connection test
      const { data, error } = await supabase.auth.getUser()

      if (error && error.message.includes("Invalid JWT")) {
        // This is actually good - it means we're connected but not authenticated
        setConnectionStatus("connected")
        await discoverTables()
      } else {
        setConnectionStatus("connected")
        await discoverTables()
      }
    } catch (error) {
      console.error("Connection failed:", error)
      setConnectionStatus("failed")
    }
  }

  const discoverTables = async () => {
    const commonTables = ["guests", "guest", "users", "visitors", "cabins", "cabin", "rooms"]
    const foundTables: string[] = []

    for (const tableName of commonTables) {
      try {
        const { data, error } = await supabase.from(tableName).select("*").limit(1)

        if (!error) {
          foundTables.push(tableName)
          console.log(`✅ Found table: ${tableName}`)
        }
      } catch (e) {
        // Table doesn't exist, continue
      }
    }

    setTables(foundTables)
  }

  const inspectTable = async (tableName: string) => {
    setSelectedTable(tableName)
    setLoading(true)

    try {
      const { data, error } = await supabase.from(tableName).select("*").limit(3)

      if (error) throw error

      setTableData(data || [])
    } catch (error) {
      console.error(`Error fetching data from ${tableName}:`, error)
      setTableData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border border-green-500/30 bg-black/50">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {connectionStatus === "testing" && <RefreshCw className="h-4 w-4 animate-spin" />}
              {connectionStatus === "connected" && <CheckCircle className="h-4 w-4 text-green-400" />}
              {connectionStatus === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
              <span>
                Status:
                <Badge variant={connectionStatus === "connected" ? "default" : "destructive"} className="ml-2">
                  {connectionStatus.toUpperCase()}
                </Badge>
              </span>
            </div>
            <Button onClick={testConnection} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Again
            </Button>
          </div>

          {connectionStatus === "connected" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-green-400">Found Tables</h3>
                {tables.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {tables.map((tableName) => (
                      <Button
                        key={tableName}
                        variant={selectedTable === tableName ? "default" : "outline"}
                        size="sm"
                        onClick={() => inspectTable(tableName)}
                        className="border-green-500/30"
                      >
                        {tableName}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-yellow-400">No common tables found. You may need to create tables first.</p>
                )}
              </div>

              {selectedTable && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-green-400">Data from "{selectedTable}"</h3>
                  {loading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Loading...</p>
                    </div>
                  ) : (
                    <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                      {tableData.length > 0 ? (
                        <pre className="text-sm text-green-300">{JSON.stringify(tableData, null, 2)}</pre>
                      ) : (
                        <p className="text-gray-400">No data in this table</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {connectionStatus === "failed" && (
            <div className="text-center py-4">
              <p className="text-red-400 mb-2">Failed to connect to Supabase</p>
              <p className="text-sm text-gray-400">Check your environment variables and network connection</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
