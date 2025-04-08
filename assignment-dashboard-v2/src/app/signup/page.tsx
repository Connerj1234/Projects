'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [successMsg, setSuccessMsg] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else {
      setSuccessMsg('Check your email to confirm your account before logging in.')
      setTimeout(() => {
        router.push('/login')
      }, 3000) // Wait 3 seconds, then redirect
    }
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm space-y-6 bg-zinc-800 p-6 rounded-xl shadow-xl"
      >
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        {successMsg && <p className="text-green-400 text-sm mb-2">{successMsg}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white focus:outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white focus:outline-none"
        />

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Sign Up
        </button>
      </form>
    </main>
  )
}
