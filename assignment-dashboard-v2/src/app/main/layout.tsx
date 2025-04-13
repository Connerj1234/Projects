'use client'

import Sidebar from '@/components/ui/sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen bg-zinc-950 text-white p-6">
          {children}
        </main>
      </div>
    )
  }
