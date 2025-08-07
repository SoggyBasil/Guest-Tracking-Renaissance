import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema types
export interface Guest {
  id: string
  name: string
  email: string
  phone?: string
  status: "checked_in" | "checked_out"
  check_in_time: string
  check_out_time?: string
  created_at: string
  updated_at: string
}

export interface CabinAllocation {
  id: string
  cabin_number: string
  guest_id: string
  allocated_at: string
  deallocated_at?: string
  created_at: string
  updated_at: string
}

// Helper functions for database operations
export const guestOperations = {
  // Get all guests with cabin information
  async getAllGuests() {
    const { data, error } = await supabase
      .from("guests")
      .select(`
        *,
        cabin_allocations (
          cabin_number,
          allocated_at
        )
      `)
      .order("check_in_time", { ascending: false })

    if (error) throw error
    return data
  },

  // Add new guest
  async addGuest(guestData: Omit<Guest, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("guests").insert([guestData]).select().single()

    if (error) throw error
    return data
  },

  // Update guest status
  async updateGuestStatus(guestId: string, status: "checked_in" | "checked_out") {
    const updateData: any = { status }
    if (status === "checked_out") {
      updateData.check_out_time = new Date().toISOString()
    }

    const { data, error } = await supabase.from("guests").update(updateData).eq("id", guestId).select().single()

    if (error) throw error
    return data
  },
}

export const cabinOperations = {
  // Get all cabin allocations
  async getAllAllocations() {
    const { data, error } = await supabase
      .from("cabin_allocations")
      .select(`
        *,
        guests (
          name,
          email,
          status
        )
      `)
      .is("deallocated_at", null)

    if (error) throw error
    return data
  },

  // Allocate cabin to guest
  async allocateCabin(cabinNumber: string, guestId: string) {
    const { data, error } = await supabase
      .from("cabin_allocations")
      .insert([
        {
          cabin_number: cabinNumber,
          guest_id: guestId,
          allocated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Deallocate cabin
  async deallocateCabin(cabinNumber: string) {
    const { data, error } = await supabase
      .from("cabin_allocations")
      .update({ deallocated_at: new Date().toISOString() })
      .eq("cabin_number", cabinNumber)
      .is("deallocated_at", null)
      .select()

    if (error) throw error
    return data
  },
}
