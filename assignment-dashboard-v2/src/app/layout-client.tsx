'use client'

import TabBar from '@/components/ui/tabbar'
import SignOutButton from '@/components/ui/signout'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col bg-zinc-900 text-white">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Productivity Hub</h1>
        <SignOutButton />
      </header>
      <TabBar />
      <div className="flex-grow px-4 py-6">
        {children}
      </div>
    </main>
  )
}
