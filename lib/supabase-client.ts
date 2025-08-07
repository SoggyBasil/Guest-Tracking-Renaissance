import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://xdgkmyqqjtmrhfgtuywg.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZ2tteXFxanRtcmhmZ3R1eXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTQzMTYsImV4cCI6MjA2OTY5MDMxNn0.F0-W4G3YUUMsuJXlfVnE0nx30dcD6fhp4kCC4TJynjQ"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getUser()
    console.log("✅ Supabase connection successful")
    return true
  } catch (error) {
    console.error("❌ Supabase connection failed:", error)
    return false
  }
}
