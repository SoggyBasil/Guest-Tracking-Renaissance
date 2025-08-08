import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely formats a date string or timestamp
 * Returns a fallback string if the date is invalid
 */
export function safeFormatDate(dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString || dateString === 'Invalid Date' || dateString === 'null' || dateString === 'undefined') {
    return 'Invalid Date'
  }
  
  try {
    // Handle custom date format: YYYYMMDD:HHMMSS (e.g., "20250808:090430")
    if (typeof dateString === 'string' && /^\d{8}:\d{6}$/.test(dateString)) {
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      const time = dateString.substring(9)
      const hour = time.substring(0, 2)
      const minute = time.substring(2, 4)
      const second = time.substring(4, 6)
      
      // Create ISO string format
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`
      const date = new Date(isoString)
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString)
        return 'Invalid Date'
      }
      
      return date.toLocaleTimeString('en-US', options || { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    
    // Handle standard date formats
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    return date.toLocaleTimeString('en-US', options || { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Invalid Date'
  }
}

/**
 * Converts custom date format (YYYYMMDD:HHMMSS) to ISO string
 * Returns null if the format is invalid
 */
export function convertCustomDateToISO(dateString: string): string | null {
  if (!dateString || typeof dateString !== 'string') {
    return null
  }
  
  // Handle custom date format: YYYYMMDD:HHMMSS (e.g., "20250808:090430")
  if (/^\d{8}:\d{6}$/.test(dateString)) {
    const year = dateString.substring(0, 4)
    const month = dateString.substring(4, 6)
    const day = dateString.substring(6, 8)
    const time = dateString.substring(9)
    const hour = time.substring(0, 2)
    const minute = time.substring(2, 4)
    const second = time.substring(4, 6)
    
    // Create ISO string format
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`
  }
  
  return null
}
