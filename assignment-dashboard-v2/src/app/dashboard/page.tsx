'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import SemesterSelector from './semester_selector'
import AssignmentListView from './assignment_list_view'
import AssignmentCalendarView from './assignment_calendar_view'
import DashboardControls, { ViewMode } from './dashboard_controls'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Semesters from './semesters'
import AssignmentTypes from './assignment_types'
import Classes from './classes'
import Assignments from './assignments'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCompleted, setShowCompleted] = useState(false)
  const [assignmentStats, setAssignmentStats] = useState({ total: 0, completed: 0, pending: 0 })

  const [showSemesters, setShowSemesters] = useState(false)
  const [showAssignments, setShowAssignments] = useState(false)
  const [showClasses, setShowClasses] = useState(false)
  const [showTypes, setShowTypes] = useState(false)
  const [assignments, setAssignments] = useState<any[]>([])

  const fetchAssignments = async () => {
    const { data, error } = await supabase.from('assignments').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id).order('due_date', { ascending: true })
    if (error) {
      console.error('Error fetching assignments:', error)
      return
    }
    setAssignments(data)
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        fetchAssignments()
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const savedShow = localStorage.getItem('showCompleted')
    if (savedShow !== null) {
      setShowCompleted(savedShow === 'true')
    }
  }, [])

  useEffect(() => {
  localStorage.setItem('showCompleted', showCompleted.toString())
}, [showCompleted])

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
    const saved = localStorage.getItem('selectedSemester')
    if (saved) setSelectedSemester(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('selectedSemester', selectedSemester)
  }, [selectedSemester])

  useEffect(() => {
    const fetchStats = () => {
      const filtered = selectedSemester === 'all'
        ? assignments
        : assignments.filter(a => a.semester_id === selectedSemester)

      const completed = filtered.filter(a => a.completed).length
      const total = filtered.length
      setAssignmentStats({ total, completed, pending: total - completed })
    }

    fetchStats()
  }, [selectedSemester, assignments])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>

  return (
    <main className="w-full min-h-screen bg-zinc-900 text-white px-4 sm:px-6">
      <div className="w-full flex flex-wrap items-center justify-between gap-4 mb-6 pt-6">
        <div className="flex items-center gap-2">
          <SemesterSelector selectedSemester={selectedSemester} setSelectedSemester={setSelectedSemester} />
          <Button variant="secondary" className="px-4 py-2 text-sm font-medium" onClick={() => setShowSemesters(true)}>+ Manage Semesters</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700" onClick={() => setShowAssignments(true)}>+ New Assignment</Button>
          <Button
             variant="secondary"
             className="px-4 py-2 text-sm font-medium"
             onClick={async () => {
               await supabase.auth.signOut()
               router.push('/')
             }}
           >
             Sign Out
           </Button>
        </div>
      </div>

      <div className="w-full px-2 lg:px-32 xl:px-48 space-y-10">
        <DashboardControls
          viewMode={viewMode}
          setViewMode={setViewMode}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          onManageClasses={() => {
            if (selectedSemester === 'all') {
              alert('Please select a semester before managing classes.')
              return
            }
            setShowClasses(true)
          }}
          onManageTypes={() => {
            if (selectedSemester === 'all') {
              alert('Please select a semester before managing types.')
              return
            }
            setShowTypes(true)
          }}
          stats={assignmentStats}
        />

        {viewMode === 'list' ? (
          <AssignmentListView selectedSemester={selectedSemester} showCompleted={showCompleted} assignments={assignments} refreshAssignments={fetchAssignments} />
        ) : (
          <AssignmentCalendarView selectedSemester={selectedSemester} showCompleted={showCompleted} />
        )}
      </div>

      <Dialog open={showSemesters} onOpenChange={setShowSemesters}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Manage Semesters</DialogTitle>
          </DialogHeader>
          <Semesters />
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignments} onOpenChange={setShowAssignments}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">New Assignment</DialogTitle>
          </DialogHeader>
          <Assignments selectedSemester={selectedSemester} fetchAssignments={fetchAssignments} />
        </DialogContent>
      </Dialog>

      <Dialog open={showClasses} onOpenChange={setShowClasses}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Manage Classes</DialogTitle>
          </DialogHeader>
          <Classes selectedSemester={selectedSemester} />
        </DialogContent>
      </Dialog>

      <Dialog open={showTypes} onOpenChange={setShowTypes}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Manage Types</DialogTitle>
          </DialogHeader>
          <AssignmentTypes selectedSemester={selectedSemester} />
        </DialogContent>
      </Dialog>
    </main>
  )
}
