import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GuestCabinAssignment } from "@/components/guest-cabin-assignment"

export default function AssignmentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              🛥️ Yacht Guest Tracking
            </h1>
            <div className="flex space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-white hover:bg-slate-800">
                  Live Tracking
                </Button>
              </Link>
              <Link href="/assignments">
                <Button variant="ghost" className="text-white hover:bg-slate-800 bg-slate-800">
                  Assignments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <GuestCabinAssignment />
      </div>
    </div>
  )
}
