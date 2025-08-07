import { SetupWizard } from "@/components/setup-wizard"
import { CyberHeader } from "@/components/cyber-header"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-black">
      <CyberHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold cyber-green mb-2">🛥️ Yacht Database Setup</h1>
            <p className="text-gray-400">Configure your complete guest tracking system</p>
          </div>
          <SetupWizard />
        </div>
      </main>
    </div>
  )
}
