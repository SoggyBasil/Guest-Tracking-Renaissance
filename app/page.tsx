import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LiveTrackingDashboard } from "@/components/live-tracking-dashboard"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">


      {/* Main Content */}
      <LiveTrackingDashboard />
    </div>
  )
}
