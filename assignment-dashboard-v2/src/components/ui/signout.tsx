'use client'

import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

type Props = {
  collapsed: boolean
}

export default function SignOutButton({ collapsed }: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      onClick={handleSignOut}
      className={`w-full flex items-center ${
        collapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'
      } mt-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition`}
    >
      <LogOut className="w-5 h-5" />
      {!collapsed && <span className="ml-3">Sign Out</span>}
    </button>
  )
}
