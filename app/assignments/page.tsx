import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GuestCabinAssignment } from "@/components/guest-cabin-assignment"
import { NavigationMenu } from "@/components/ui/navigation-menu"

export default function AssignmentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Guest Assignments
            </h1>
            <p className="text-slate-400 mt-2">Manage guest and cabin assignments</p>
          </div>
          <NavigationMenu showBackButton={true} backButtonText="Back to Dashboard" backButtonHref="/" />
        </div>

        {/* Main Content */}
        <GuestCabinAssignment />
      </div>
    </div>
  )
}
