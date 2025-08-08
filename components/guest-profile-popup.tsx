import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, MapPin, Signal, User, Phone, Mail } from "lucide-react"

interface GuestProfilePopupProps {
  isOpen: boolean
  onClose: () => void
  guest: {
    name: string
    email?: string
    phone?: string
    guest_type?: string
    allergies?: string
    special_requests?: string
    profile_photo?: string
  } | null
  wristband: {
    wristband_id: string
    location: string
    previousLocation?: string
    signalStrength: number
    isOnTheMove?: boolean
    cabin?: string
  } | null
}

export function GuestProfilePopup({ isOpen, onClose, guest, wristband }: GuestProfilePopupProps) {
  if (!guest || !wristband) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="cyber-bg cyber-border max-w-md">
        <DialogHeader>
          <DialogTitle className="cyber-green text-xl">Guest Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Guest Header */}
          <div className="flex items-center space-x-4">
            {guest.profile_photo && guest.profile_photo.trim() !== "" ? (
              <img
                src={guest.profile_photo}
                alt={guest.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-green-500/50"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div className={`w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center ${guest.profile_photo && guest.profile_photo.trim() !== "" ? 'hidden' : ''}`}>
              <User className="h-8 w-8 cyber-green" />
            </div>
            <div>
              <h3 className="text-lg font-bold cyber-green">{guest.name}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="border-green-400 text-green-400">
                  {guest.guest_type || "Guest"}
                </Badge>
                {wristband.isOnTheMove && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-400">ON THE MOVE</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 text-sm border-t border-green-500/30 pt-3">
            {guest.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <p className="text-gray-400">{guest.email}</p>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-green-400" />
                <p className="text-gray-400">{guest.phone}</p>
              </div>
            )}
          </div>

          {/* Location Info */}
          <div className="space-y-2 border-t border-green-500/30 pt-3">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-400">Current Location:</p>
                <p className="text-sm text-gray-300">{wristband.location}</p>
                {wristband.previousLocation && wristband.isOnTheMove && (
                  <p className="text-xs text-gray-500 line-through">Previously: {wristband.previousLocation}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Signal className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-green-400">Signal Strength:</p>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full ${
                      wristband.signalStrength >= -59
                        ? "bg-green-500"
                        : wristband.signalStrength >= -69
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                                          style={{ width: `${Math.max(0, Math.min(100, ((wristband.signalStrength + 100) / 50) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {wristband.cabin && (
              <div className="flex items-start space-x-2">
                <div className="h-4 w-4 text-purple-400 mt-0.5">🛏️</div>
                <div>
                  <p className="text-xs font-medium text-purple-400">Assigned Cabin:</p>
                  <p className="text-sm text-gray-300">{wristband.cabin}</p>
                </div>
              </div>
            )}
          </div>

          {/* Allergies & Special Requests */}
          {(guest.allergies || guest.special_requests) && (
            <div className="border-t border-green-500/30 pt-3 space-y-3">
              {guest.allergies && (
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-400">Allergies:</p>
                    <p className="text-sm text-gray-400">{guest.allergies}</p>
                  </div>
                </div>
              )}

              {guest.special_requests && (
                <div className="flex items-start space-x-2">
                  <div className="h-4 w-4 text-yellow-400 mt-0.5">⭐</div>
                  <div>
                    <p className="text-xs font-medium text-yellow-400">Special Requests:</p>
                    <p className="text-sm text-gray-400">{guest.special_requests}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wristband Info */}
          <div className="border-t border-green-500/30 pt-3">
            <p className="text-xs text-gray-500">
              Wristband ID: <span className="text-gray-400">{wristband.wristband_id}</span>
            </p>
            <p className="text-xs text-gray-500">
                              Last Updated: <span className="text-gray-400">{new Date().toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
