import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-brand-50">
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
