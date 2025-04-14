'use client'

import Sidebar from '@/components/ui/sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen text-white border-l border-zinc-800">
          {children}
        </main>
      </div>
    )
  }
