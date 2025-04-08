'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import SemesterSelector from './semester_selector'
import Semesters from './semesters'
import AssignmentTypes from './assignment_types'
import Classes from './classes'
import Assignments from './assignments'
import AssignmentListView from './assignment_list_view'
import AssignmentCalendar from './assignment_calendar_view'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('all')

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/login')
      } else {
        setEmail(sessionData.session.user.email ?? '')
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
        Loading...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Welcome back, {email}!</h1>
      <SemesterSelector
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
      />

      <AssignmentListView selectedSemester={selectedSemester} />
      <AssignmentCalendar selectedSemester={selectedSemester} />
      <Semesters />
      <AssignmentTypes selectedSemester={selectedSemester} />
      <Classes selectedSemester={selectedSemester} />
      <Assignments selectedSemester={selectedSemester} />
    </main>
  )
}
