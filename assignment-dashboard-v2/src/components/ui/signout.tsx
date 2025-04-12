'use client'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <Button
      variant="secondary"
      className="px-4 py-2 text-sm font-medium"
      onClick={handleSignOut}
    >
      Sign Out
    </Button>
  )
}
