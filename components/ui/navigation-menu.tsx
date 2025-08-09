"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Menu, X, Users, Phone, Activity } from "lucide-react"

interface NavigationMenuProps {
  showBackButton?: boolean
  backButtonText?: string
  backButtonHref?: string
}

export function NavigationMenu({ 
  showBackButton = false, 
  backButtonText = "Back to Dashboard",
  backButtonHref = "/"
}: NavigationMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = [
    {
      href: "/",
      label: "Live Tracking",
      icon: Activity,
      description: "Real-time guest location monitoring"
    },
    {
      href: "/service-calls",
      label: "Service Calls",
      icon: Phone,
      description: "Service call management"
    },
    {
      href: "/assignments",
      label: "Assignments",
      icon: Users,
      description: "Guest and cabin assignments"
    }
  ]

  const currentPage = menuItems.find(item => item.href === pathname)

  return (
    <div className="relative">
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between">
        {/* Left side - Back button or title */}
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Link href={backButtonHref}>
              <Button variant="outline" size="sm" className="border-blue-400 text-blue-400 bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {backButtonText}
              </Button>
            </Link>
          )}
        </div>

        {/* Right side - Menu button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-slate-800/50 hover:bg-slate-700/50"
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Menu */}
      {isMenuOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <div className="text-sm text-slate-400 mb-3 px-2">Navigation</div>
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                    <div className={`
                      flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer
                      ${isActive 
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400' 
                        : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                      }
                    `}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.description}</div>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close menu when clicking outside */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  )
}
