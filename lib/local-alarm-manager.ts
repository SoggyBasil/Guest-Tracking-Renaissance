"use client"

// Local alarm state management - maintains our own version of alarm states
// This prevents the need to modify external systems and gives us full control

export interface LocalAlarmState {
  id: string
  originalData: any // The original XML/API data
  status: 'active' | 'acknowledged' | 'cleared' | 'hidden'
  acknowledgedBy?: string
  acknowledgedAt?: string
  clearedBy?: string
  clearedAt?: string
  notes?: string
  // Flash state tracking
  hasFlashedRed?: boolean // Has this alarm ever flashed red?
  hasFlashedGreen?: boolean // Has this alarm ever flashed green?
  lastFlashTime?: string // When did it last flash?
}

export interface LocalAlarmStorage {
  alarms: Record<string, LocalAlarmState>
  lastUpdated: string
  version: string
}

class LocalAlarmManager {
  private storageKey = 'yacht-alarm-states'
  private storage: LocalAlarmStorage = {
    alarms: {},
    lastUpdated: new Date().toISOString(),
    version: '1.0'
  }

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.storage = {
          alarms: parsed.alarms || {},
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          version: parsed.version || '1.0'
        }
        console.log(`📱 Loaded ${Object.keys(this.storage.alarms).length} local alarm states`)
      }
    } catch (error) {
      console.error('❌ Error loading alarm states from localStorage:', error)
      this.storage = {
        alarms: {},
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }
    }
  }

  private saveToStorage(): void {
    try {
      this.storage.lastUpdated = new Date().toISOString()
      localStorage.setItem(this.storageKey, JSON.stringify(this.storage))
    } catch (error) {
      console.error('❌ Error saving alarm states to localStorage:', error)
    }
  }

  // Process incoming alarms from XML/API and apply local state
  processIncomingAlarms(incomingAlarms: any[]): any[] {
    const processedAlarms = incomingAlarms.map(alarm => {
      const alarmId = this.generateAlarmId(alarm)
      const localState = this.storage.alarms[alarmId]
      
      if (localState) {
        // PRESERVE local state - don't let server data override our local management
        console.log(`📱 Preserving local state for alarm ${alarmId}: ${localState.status}`)
        return {
          ...alarm,
          // Override server status with our local state
          status: localState.status === 'acknowledged' ? 'accepted' : alarm.status,
          ackBy: localState.acknowledgedBy || alarm.ackBy,
          ackTime: localState.acknowledgedAt || alarm.ackTime,
          localStatus: localState.status,
          localAcknowledgedBy: localState.acknowledgedBy,
          localAcknowledgedAt: localState.acknowledgedAt,
          localClearedBy: localState.clearedBy,
          localClearedAt: localState.clearedAt,
          localNotes: localState.notes,
          isLocallyManaged: true
        }
      }
      
      // New alarm - store it but keep original status
      this.storage.alarms[alarmId] = {
        id: alarmId,
        originalData: { ...alarm },
        status: 'active'
      }
      
      return {
        ...alarm,
        localStatus: 'active',
        isLocallyManaged: false // New alarm, not yet locally managed
      }
    })
    
    this.saveToStorage()
    return processedAlarms
  }

  // Generate consistent alarm ID from alarm data
  private generateAlarmId(alarm: any): string {
    // Create a consistent ID based on alarm content
    // Use multiple fields to ensure uniqueness while being consistent
    const keyParts = [
      alarm.id?.toString() || '',
      alarm.text || '',
      alarm.wristbands?.join(',') || '',
      alarm.timestamp || ''
    ].filter(Boolean)
    
    // If we have an explicit ID, use it; otherwise create a hash-like ID
    if (alarm.id) {
      return `alarm_${alarm.id}`
    }
    
    // Create a simple hash from the content
    const content = keyParts.join('|')
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `alarm_${Math.abs(hash)}`
  }

  // Acknowledge a specific alarm locally
  acknowledgeAlarm(alarmId: string, acknowledgedBy: string = 'User'): boolean {
    if (this.storage.alarms[alarmId]) {
      this.storage.alarms[alarmId] = {
        ...this.storage.alarms[alarmId],
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString()
      }
      this.saveToStorage()
      console.log(`✅ Locally acknowledged alarm ${alarmId} by ${acknowledgedBy}`)
      return true
    }
    return false
  }

  // Acknowledge multiple alarms
  acknowledgeAlarms(alarmIds: string[], acknowledgedBy: string = 'User'): number {
    let count = 0
    alarmIds.forEach(id => {
      if (this.acknowledgeAlarm(id, acknowledgedBy)) {
        count++
      }
    })
    console.log(`✅ Locally acknowledged ${count}/${alarmIds.length} alarms`)
    return count
  }

  // Clear/hide a specific alarm locally
  clearAlarm(alarmId: string, clearedBy: string = 'User'): boolean {
    if (this.storage.alarms[alarmId]) {
      this.storage.alarms[alarmId] = {
        ...this.storage.alarms[alarmId],
        status: 'cleared',
        clearedBy,
        clearedAt: new Date().toISOString()
      }
      this.saveToStorage()
      console.log(`🧹 Locally cleared alarm ${alarmId} by ${clearedBy}`)
      return true
    }
    return false
  }

  // Clear all alarms locally (removes from display)
  clearAllAlarms(clearedBy: string = 'System'): number {
    let count = 0
    Object.keys(this.storage.alarms).forEach(alarmId => {
      // Clear ALL alarms regardless of status
      this.clearAlarm(alarmId, clearedBy)
      count++
    })
    console.log(`🧹 Locally cleared ${count} total alarms`)
    return count
  }

  // Clear only active alarms
  clearActiveAlarms(clearedBy: string = 'System'): number {
    let count = 0
    Object.keys(this.storage.alarms).forEach(alarmId => {
      if (this.storage.alarms[alarmId].status === 'active') {
        this.clearAlarm(alarmId, clearedBy)
        count++
      }
    })
    console.log(`🧹 Locally cleared ${count} active alarms`)
    return count
  }

  // Hide alarm (stronger than clear - won't show even if it comes back from server)
  hideAlarm(alarmId: string, hiddenBy: string = 'User'): boolean {
    if (this.storage.alarms[alarmId]) {
      this.storage.alarms[alarmId] = {
        ...this.storage.alarms[alarmId],
        status: 'hidden',
        clearedBy: hiddenBy,
        clearedAt: new Date().toISOString()
      }
      this.saveToStorage()
      console.log(`👁️ Locally hidden alarm ${alarmId} by ${hiddenBy}`)
      return true
    }
    return false
  }

  // Get alarm state
  getAlarmState(alarmId: string): LocalAlarmState | null {
    return this.storage.alarms[alarmId] || null
  }

  // Get all alarm states
  getAllAlarmStates(): Record<string, LocalAlarmState> {
    return { ...this.storage.alarms }
  }

  // Clean up old cleared/hidden alarms (older than 7 days)
  cleanupOldAlarms(): number {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    let cleanedCount = 0
    
    Object.keys(this.storage.alarms).forEach(alarmId => {
      const alarm = this.storage.alarms[alarmId]
      if ((alarm.status === 'cleared' || alarm.status === 'hidden') && alarm.clearedAt) {
        const clearedDate = new Date(alarm.clearedAt)
        if (clearedDate < sevenDaysAgo) {
          delete this.storage.alarms[alarmId]
          cleanedCount++
        }
      }
    })
    
    if (cleanedCount > 0) {
      this.saveToStorage()
      console.log(`🧹 Cleaned up ${cleanedCount} old alarm states`)
    }
    
    return cleanedCount
  }

  // Export alarm states for backup
  exportAlarmStates(): string {
    return JSON.stringify(this.storage, null, 2)
  }

  // Import alarm states from backup
  importAlarmStates(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData)
      this.storage = {
        alarms: imported.alarms || {},
        lastUpdated: new Date().toISOString(),
        version: imported.version || '1.0'
      }
      this.saveToStorage()
      console.log(`📥 Imported ${Object.keys(this.storage.alarms).length} alarm states`)
      return true
    } catch (error) {
      console.error('❌ Error importing alarm states:', error)
      return false
    }
  }

  // Track flash states to prevent re-flashing
  markAlarmFlashed(alarmId: string, flashType: 'red' | 'green'): void {
    if (!this.storage.alarms[alarmId]) {
      // Create alarm state if it doesn't exist
      this.storage.alarms[alarmId] = {
        id: alarmId,
        originalData: {},
        status: 'active'
      }
    }
    
    const alarm = this.storage.alarms[alarmId]
    if (flashType === 'red') {
      alarm.hasFlashedRed = true
    } else if (flashType === 'green') {
      alarm.hasFlashedGreen = true
    }
    alarm.lastFlashTime = new Date().toISOString()
    
    this.saveToStorage()
    console.log(`⚡ Marked alarm ${alarmId} as flashed ${flashType}`)
  }

  // Check if alarm has already flashed
  hasAlarmFlashed(alarmId: string, flashType: 'red' | 'green'): boolean {
    const alarm = this.storage.alarms[alarmId]
    if (!alarm) return false
    
    if (flashType === 'red') {
      return alarm.hasFlashedRed === true
    } else if (flashType === 'green') {
      return alarm.hasFlashedGreen === true
    }
    
    return false
  }

  // Reset flash states (for testing)
  resetFlashStates(): void {
    Object.keys(this.storage.alarms).forEach(alarmId => {
      const alarm = this.storage.alarms[alarmId]
      alarm.hasFlashedRed = false
      alarm.hasFlashedGreen = false
      alarm.lastFlashTime = undefined
    })
    this.saveToStorage()
    console.log('🔄 Reset all flash states')
  }

  // Get statistics
  getStats(): { total: number, active: number, acknowledged: number, cleared: number, hidden: number } {
    const alarms = Object.values(this.storage.alarms)
    return {
      total: alarms.length,
      active: alarms.filter(a => a.status === 'active').length,
      acknowledged: alarms.filter(a => a.status === 'acknowledged').length,
      cleared: alarms.filter(a => a.status === 'cleared').length,
      hidden: alarms.filter(a => a.status === 'hidden').length
    }
  }
}

// Export singleton instance
export const localAlarmManager = new LocalAlarmManager()

// Auto cleanup old alarms on startup
setTimeout(() => {
  localAlarmManager.cleanupOldAlarms()
}, 5000) // 5 seconds after startup
