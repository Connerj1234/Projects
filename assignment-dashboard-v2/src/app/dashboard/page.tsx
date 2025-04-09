'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import SemesterSelector from './semester_selector'
import AssignmentListView from './assignment_list_view'
import AssignmentCalendarView from './assignment_calendar_view'
import DashboardControls, { ViewMode } from './dashboard_controls'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCompleted, setShowCompleted] = useState(true)
  const [assignmentStats, setAssignmentStats] = useState({ total: 0, completed: 0, pending: 0 })

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

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from('assignments').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      if (!data) return
      const filtered = selectedSemester === 'all' ? data : data.filter(a => a.semester_id === selectedSemester)
      const completed = filtered.filter(a => a.completed).length
      const total = filtered.length
      setAssignmentStats({ total, completed, pending: total - completed })
    }
    fetchStats()
  }, [selectedSemester])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>

  return (
    <main className="w-full min-h-screen bg-zinc-900 text-white px-4 sm:px-6">
      <div className="w-full flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <SemesterSelector selectedSemester={selectedSemester} setSelectedSemester={setSelectedSemester} />
          <Button variant="secondary" className="px-4 py-2 text-sm font-medium">+ Manage Semesters</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700">+ New Assignment</Button>
          <Button variant="outline" className="px-4 py-2 text-sm font-medium">Sign Out</Button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <DashboardControls
              viewMode={viewMode}
              setViewMode={setViewMode}
              showCompleted={showCompleted}
              setShowCompleted={setShowCompleted}
              onManageClasses={() => {}}
              onManageTypes={() => {}}
              stats={assignmentStats}
            />

            <div className="flex items-center gap-2">
              <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
              <label htmlFor="show-completed" className="text-sm">Show Completed</label>
            </div>

            <Button variant="secondary" className="text-sm">Manage Classes</Button>
            <Button variant="secondary" className="text-sm">Manage Types</Button>
          </div>
        </div>

        <h1 className="text-3xl font-bold">Welcome back, {email}!</h1>

        {viewMode === 'list' ? (
          <AssignmentListView selectedSemester={selectedSemester} showCompleted={showCompleted} />
        ) : (
          <AssignmentCalendarView selectedSemester={selectedSemester} showCompleted={showCompleted} />
        )}
      </div>
    </main>
  )
}
