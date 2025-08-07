"use client"

import { useState, useEffect } from "react"
import { supabase, testConnection } from "@/lib/supabase-client"

export function DatabaseTest() {
  const [status, setStatus] = useState("testing")
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState("")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setStatus("testing")
    const connected = await testConnection()
    setStatus(connected ? "connected" : "failed")

    if (connected) {
      await findTables()
    }
  }

  const findTables = async () => {
    const tableNames = ["guests", "guest", "users", "visitors", "cabins", "cabin", "rooms", "bookings"]
    const found: string[] = []

    for (const name of tableNames) {
      try {
        const { data, error } = await supabase.from(name).select("*").limit(1)
        if (!error) {
          found.push(name)
        }
      } catch (e) {
        // Continue
      }
    }

    setTables(found)
  }

  const loadTableData = async (tableName: string) => {
    setSelectedTable(tableName)
    setLoading(true)

    try {
      const { data, error } = await supabase.from(tableName).select("*").limit(5)
      if (error) throw error
      setData(data || [])
    } catch (error) {
      console.error("Error loading table data:", error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold cyber-green mb-4">GUEST.SYS</h1>
          <p className="text-gray-400">Database Connection Test</p>
        </div>

        {/* Connection Status */}
        <div className="cyber-bg cyber-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-4 h-4 rounded-full ${status === "connected" ? "bg-green-400" : status === "failed" ? "bg-red-400" : "bg-yellow-400"}`}
              ></div>
              <span className="text-lg">
                Status: <span className="cyber-green font-bold">{status.toUpperCase()}</span>
              </span>
            </div>
            <button
              onClick={checkConnection}
              className="cyber-border cyber-green px-4 py-2 rounded hover:cyber-glow transition-all"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Tables */}
        {status === "connected" && (
          <div className="cyber-bg cyber-border rounded-lg p-6 mb-8">
            <h2 className="text-2xl cyber-green mb-4">Available Tables</h2>
            {tables.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <button
                    key={table}
                    onClick={() => loadTableData(table)}
                    className={`p-3 rounded border transition-all ${
                      selectedTable === table
                        ? "cyber-border cyber-glow cyber-green"
                        : "border-gray-600 text-gray-300 hover:border-green-400"
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-yellow-400">No tables found. You may need to create tables first.</p>
            )}
          </div>
        )}

        {/* Table Data */}
        {selectedTable && (
          <div className="cyber-bg cyber-border rounded-lg p-6">
            <h2 className="text-2xl cyber-green mb-4">Data from "{selectedTable}"</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <p className="mt-2">Loading...</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                {data.length > 0 ? (
                  <pre className="text-green-300 text-sm whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                ) : (
                  <p className="text-gray-400">No data found in this table</p>
                )}
              </div>
            )}
          </div>
        )}

        {status === "failed" && (
          <div className="cyber-bg border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-2xl text-red-400 mb-4">Connection Failed</h2>
            <p className="text-gray-400">Please check your Supabase configuration</p>
          </div>
        )}
      </div>
    </div>
  )
}
