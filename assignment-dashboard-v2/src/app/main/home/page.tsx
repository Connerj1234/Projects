'use client'

import { useRouter } from 'next/navigation'
import LayoutClient from '@/app/layout-client'
export default function HomePage() {
  const router = useRouter()

  return (
    <LayoutClient>
      <div className="min-h-screen bg-zinc-900 text-white px-4 py-6">
        <div className="flex items-center justify-between mb-4 px-2">

        </div>
      </div>
    </LayoutClient>
  )
}
