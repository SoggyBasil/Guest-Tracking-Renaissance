"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase, testConnection, getSchema } from "@/lib/supabase-client"
import { Database, Table, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export function DatabaseInspector() {
  const [connectionStatus, setConnectionStatus] = useState<"testing" | "connected" | "failed">("testing")
  const [tables, setTables] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setConnectionStatus("testing")
    const isConnected = await testConnection()
    setConnectionStatus(isConnected ? "connected" : "failed")

    if (isConnected) {
      await fetchTables()
    }
  }

  const fetchTables = async () => {
    try {
      // Use our custom schema discovery instead of system tables
      const foundTables = await getSchema()

      if (foundTables && foundTables.length > 0) {
        setTables(foundTables)
        console.log("Found tables:", foundTables)
      } else {
        console.log("No common tables found. Trying to discover any tables...")

        // Try a few more specific attempts
        const testTables = ["profiles", "accounts", "data", "records"]
        const additionalTables = []

        for (const tableName of testTables) {
          try {
            const { data, error } = await supabase.from(tableName).select("*").limit(1)
            if (!error) {
              additionalTables.push({ table_name: tableName })
            }
          } catch (e) {
            // Continue
          }
        }

        setTables(additionalTables)
      }
    } catch (error) {
      console.error("Error fetching tables:", error)
      setTables([])
    }
  }

  const inspectTable = async (tableName: string) => {
    setSelectedTable(tableName)
    setLoading(true)

    try {
      // Get sample data from the table
      const { data, error } = await supabase.from(tableName).select("*").limit(5)

      if (error) throw error

      setTableData(data || [])
      console.log(`Data from ${tableName}:`, data)
    } catch (error) {
      console.error(`Error fetching data from ${tableName}:`, error)
      setTableData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="cyber-text flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Inspector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {connectionStatus === "testing" && <RefreshCw className="h-4 w-4 animate-spin" />}
              {connectionStatus === "connected" && <CheckCircle className="h-4 w-4 text-cyber-green" />}
              {connectionStatus === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
              <span>
                Connection Status:
                <Badge variant={connectionStatus === "connected" ? "default" : "destructive"} className="ml-2">
                  {connectionStatus.toUpperCase()}
                </Badge>
              </span>
            </div>
            <Button onClick={checkConnection} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {connectionStatus === "connected" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 cyber-text">Available Tables</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {tables.map((table) => (
                    <Button
                      key={table.table_name}
                      variant={selectedTable === table.table_name ? "default" : "outline"}
                      size="sm"
                      onClick={() => inspectTable(table.table_name)}
                      className="cyber-border"
                    >
                      <Table className="h-4 w-4 mr-2" />
                      {table.table_name}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedTable && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 cyber-text">Sample Data from "{selectedTable}"</h3>
                  {loading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Loading data...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {tableData.length > 0 ? (
                        <pre className="bg-background/50 p-4 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(tableData, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground">No data found in this table</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
