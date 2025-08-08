"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, Phone, User, X } from "lucide-react"
import { TraceITServiceItem } from "@/lib/traceit"
import { safeFormatDate } from "@/lib/utils"

interface ServiceCallPopupProps {
  serviceCall: TraceITServiceItem | null
  isOpen: boolean
  onClose: () => void
}

export function ServiceCallPopup({ serviceCall, isOpen, onClose }: ServiceCallPopupProps) {
  if (!serviceCall) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sentToRadios':
        return 'bg-red-500 text-white'
      case 'accepted':
      case 'expired':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sentToRadios':
        return <AlertTriangle className="h-4 w-4" />
      case 'accepted':
      case 'expired':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sentToRadios':
        return 'SENT TO RADIOS'
      case 'accepted':
        return 'ACCEPTED'
      case 'expired':
        return 'ACCEPTED' // Show as accepted even though it's expired
      default:
        return status.toUpperCase()
    }
  }

  const formatTime = (timestamp: string) => {
    return safeFormatDate(timestamp)
  }

  const formatAckTime = (ackTime: string) => {
    return safeFormatDate(ackTime)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-red-400" />
            Service Call #{serviceCall.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(serviceCall.status || 'sentToRadios')}>
              {getStatusIcon(serviceCall.status || 'sentToRadios')}
              <span className="ml-1">{getStatusText(serviceCall.status || 'sentToRadios')}</span>
            </Badge>
            <span className="text-slate-400 text-sm">
              {formatTime(serviceCall.timestamp || new Date().toISOString())}
            </span>
          </div>

          {/* Description */}
          <div>
            <p className="text-white font-medium">{serviceCall.text}</p>
          </div>

          {/* Wristbands - Only show count, not details */}
          {serviceCall.wristbands.length > 0 && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-300">
                Affected Wristbands: {serviceCall.wristbands.length}
              </span>
            </div>
          )}

          {/* Acceptance Details */}
          {(serviceCall.status === 'accepted' || serviceCall.status === 'expired') && 
           serviceCall.ackBy && serviceCall.ackTime && (
            <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
              <div className="text-sm text-green-400 font-medium">
                Accepted by {serviceCall.ackBy}
              </div>
              <div className="text-xs text-slate-400">
                at {formatAckTime(serviceCall.ackTime)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1 border-slate-600 text-slate-300"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            {(serviceCall.status === 'sentToRadios') && (
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // TODO: Implement accept call functionality
                  console.log('Accept call:', serviceCall.id)
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Call
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
