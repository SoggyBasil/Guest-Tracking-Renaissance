"use client"

import { ServiceCallAlert } from "@/hooks/use-service-calls"
import { safeFormatDate } from "@/lib/utils"

interface ServiceCallAlertsProps {
  alerts: ServiceCallAlert[]
}

export function ServiceCallAlerts({ alerts }: ServiceCallAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-cyan-400">Service Calls:</div>
      {alerts.map((alert, index) => (
        <div key={index} className="text-xs bg-cyan-900/20 border border-cyan-500/30 rounded p-2">
          <div className="text-cyan-300 font-medium">{alert.text}</div>
          <div className="text-cyan-400/70 mt-1">
            {(alert.status === 'accepted' || alert.status === 'expired') && alert.ackBy ? (
              <>Accepted by {alert.ackBy} at {safeFormatDate(alert.ackTime)}</>
            ) : (
              <>Status: {alert.status === 'sentToRadios' ? 'Sent to Radios' : alert.status === 'expired' ? 'Accepted' : alert.status}</>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
