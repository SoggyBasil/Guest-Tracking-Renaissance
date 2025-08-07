import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Guest {
  id: number
  name: string
  email?: string
  phone?: string
  cabin_id?: number
  check_in_date: string
  check_out_date?: string
  guest_type: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface YachtCabin {
  id: number
  cabin_number: string
  cabin_name: string
  deck: string
  cabin_type: string
  capacity: number
  position: string
  guest_id?: number
  occupied_since?: string
  guest?: Guest
}

export interface GuestLog {
  id: number
  guest_id: number
  activity: string
  location?: string
  timestamp: string
  details?: any
}

export interface YachtStats {
  totalGuests: number
  totalCabins: number
  occupiedCabins: number
  availableCabins: number
  recentActivity: number
  guestsByType: Record<string, number>
}

export async function getGuests(): Promise<Guest[]> {
  const { data, error } = await supabase.from("guests").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching guests:", error)
    return []
  }

  return data || []
}

export async function getCabins(): Promise<YachtCabin[]> {
  const { data, error } = await supabase
    .from("yacht_cabins")
    .select(`
      *,
      guest:guests(*)
    `)
    .order("cabin_number")

  if (error) {
    console.error("Error fetching cabins:", error)
    return []
  }

  return data || []
}

export async function getYachtStats(): Promise<YachtStats> {
  try {
    // Get total guests
    const { count: totalGuests } = await supabase.from("guests").select("*", { count: "exact", head: true })

    // Get total cabins
    const { count: totalCabins } = await supabase.from("yacht_cabins").select("*", { count: "exact", head: true })

    // Get occupied cabins
    const { count: occupiedCabins } = await supabase
      .from("yacht_cabins")
      .select("*", { count: "exact", head: true })
      .not("guest_id", "is", null)

    // Get recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { count: recentActivity } = await supabase
      .from("guest_logs")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", yesterday.toISOString())

    // Get guests by type
    const { data: guestTypes } = await supabase.from("guests").select("guest_type")

    const guestsByType =
      guestTypes?.reduce(
        (acc, guest) => {
          acc[guest.guest_type] = (acc[guest.guest_type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return {
      totalGuests: totalGuests || 0,
      totalCabins: totalCabins || 0,
      occupiedCabins: occupiedCabins || 0,
      availableCabins: (totalCabins || 0) - (occupiedCabins || 0),
      recentActivity: recentActivity || 0,
      guestsByType,
    }
  } catch (error) {
    console.error("Error fetching yacht stats:", error)
    return {
      totalGuests: 0,
      totalCabins: 0,
      occupiedCabins: 0,
      availableCabins: 0,
      recentActivity: 0,
      guestsByType: {},
    }
  }
}

export async function addGuest(guest: Omit<Guest, "id" | "created_at" | "updated_at">): Promise<Guest | null> {
  const { data, error } = await supabase.from("guests").insert([guest]).select().single()

  if (error) {
    console.error("Error adding guest:", error)
    return null
  }

  return data
}

export async function updateGuest(id: number, updates: Partial<Guest>): Promise<Guest | null> {
  const { data, error } = await supabase
    .from("guests")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating guest:", error)
    return null
  }

  return data
}

export async function deleteGuest(id: number): Promise<boolean> {
  const { error } = await supabase.from("guests").delete().eq("id", id)

  if (error) {
    console.error("Error deleting guest:", error)
    return false
  }

  return true
}

export async function addGuestLog(log: Omit<GuestLog, "id" | "timestamp">): Promise<GuestLog | null> {
  const { data, error } = await supabase
    .from("guest_logs")
    .insert([{ ...log, timestamp: new Date().toISOString() }])
    .select()
    .single()

  if (error) {
    console.error("Error adding guest log:", error)
    return null
  }

  return data
}

export async function getGuestLogs(guestId?: number): Promise<GuestLog[]> {
  let query = supabase.from("guest_logs").select("*").order("timestamp", { ascending: false })

  if (guestId) {
    query = query.eq("guest_id", guestId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching guest logs:", error)
    return []
  }

  return data || []
}
