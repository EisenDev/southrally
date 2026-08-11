'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardLayoutClientProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  }
  children: React.ReactNode
}

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/dashboard/admin')
  const usesAdminDashboard = isAdminRoute || user?.role === 'ADMIN' || user?.role === 'STAFF'
  const dashboardThemeClass = usesAdminDashboard ? 'admin-dashboard-theme' : 'player-dashboard-theme'

  // Close sidebar drawer automatically on navigation change
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className={dashboardThemeClass} style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      {/* Off-canvas Overlay for mobile drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 990,
            display: 'none' // Controlled via CSS media queries in globals.css
          }}
          className="mobile-sidebar-overlay"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar user={user} isOpen={isSidebarOpen} />

      {/* Main layout frame */}
      <div className="main-layout-frame">
        <Header user={user} onMenuClick={toggleSidebar} />
        
        <main
          style={{
            flex: 1,
            padding: 'var(--spacing-page-y) var(--spacing-page-x)',
            maxWidth: '1600px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
          className="main-content-area"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
