import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions that work with your existing database structure
export const existingDbOperations = {
  // Get all guests with their current cabin assignments
  async getAllGuestsWithCabins() {
    const { data, error } = await supabase
      .from("guests")
      .select(`
        *,
        cabins(
          cabin_number,
          id
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  // Get active guests only
  async getActiveGuests() {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("status", "active") // adjust status value as needed
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  // Get all cabins with guest information
  async getAllCabinsWithGuests() {
    const { data, error } = await supabase
      .from("cabins")
      .select(`
        *,
        guests(
          id,
          name,
          email,
          status
        )
      `)
      .order("cabin_number")

    if (error) throw error
    return data
  },

  // Add new guest
  async addGuest(guestData: {
    name: string
    email: string
    phone?: string
    status?: string
  }) {
    const { data, error } = await supabase
      .from("guests")
      .insert([
        {
          ...guestData,
          status: guestData.status || "active",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update guest status
  async updateGuestStatus(guestId: string, status: string) {
    const { data, error } = await supabase
      .from("guests")
      .update({
        status,
        ...(status === "inactive" && { checkout_time: new Date().toISOString() }),
      })
      .eq("id", guestId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Allocate cabin to guest
  async allocateCabin(cabinId: string, guestId: string) {
    const { data, error } = await supabase
      .from("cabins")
      .update({ guest_id: guestId })
      .eq("id", cabinId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Deallocate cabin
  async deallocateCabin(cabinId: string) {
    const { data, error } = await supabase.from("cabins").update({ guest_id: null }).eq("id", cabinId).select().single()

    if (error) throw error
    return data
  },

  // Get dashboard statistics
  async getDashboardStats() {
    try {
      // Get total guests
      const { count: totalGuests } = await supabase.from("guests").select("*", { count: "exact", head: true })

      // Get active guests
      const { count: activeGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")

      // Get occupied cabins
      const { count: occupiedCabins } = await supabase
        .from("cabins")
        .select("*", { count: "exact", head: true })
        .not("guest_id", "is", null)

      return {
        totalGuests: totalGuests || 0,
        activeGuests: activeGuests || 0,
        occupiedCabins: occupiedCabins || 0,
        systemStatus: "ONLINE",
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      return {
        totalGuests: 0,
        activeGuests: 0,
        occupiedCabins: 0,
        systemStatus: "ERROR",
      }
    }
  },
}
