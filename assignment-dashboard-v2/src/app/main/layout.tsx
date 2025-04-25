'use client'

import Sidebar from '@/components/ui/sidebar'
import { useState } from 'react'

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
          <div className="bg-zinc-900 text-white">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <main
              className={`min-h-screen transition-all duration-300 ${
                collapsed ? 'ml-16' : 'ml-40'
              }`}
            >
              {children}
            </main>
          </div>
      )
    }
