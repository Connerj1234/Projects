'use client'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeftRightIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SignOutButtonProps = {
    collapsed: boolean;
  };

export default function SignOutButton({ collapsed }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="mt-4 px-3">
      <button
        onClick={handleSignOut}
        className={`w-full flex items-center justify-center ${
          collapsed ? 'p-3' : 'px-4 py-2'
        } text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition`}
      >
        {collapsed ? (
          <ArrowLeftRightIcon className="w-5 h-5" /> // or use an appropriate icon
        ) : (
          'Sign Out'
        )}
      </button>
    </div>

  )
}
