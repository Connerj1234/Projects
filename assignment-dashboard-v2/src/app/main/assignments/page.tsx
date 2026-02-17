'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/localdb/client'

import SemesterSelector from './semester_selector'
import AssignmentListView from './list_view'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Semesters from './semesters'
import AssignmentTypes from './assignment_types'
import Classes from './classes'
import Assignments from './assignments'
import EditAssignment from './edit_assignment'

type Assignment = {
  id: string
  title: string
  due_date: string
  completed: boolean
  semester_id: string
  class_id: string
  type_id: string
  notes?: string
  semesters?: { name: string }
}

export default function Dashboard() {
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [assignmentStats, setAssignmentStats] = useState({ total: 0, completed: 0, pending: 0 })
  const [semesters, setSemesters] = useState<any[]>([])

  const [showSemesters, setShowSemesters] = useState(false)
  const [showAssignments, setShowAssignments] = useState(false)
  const [showClasses, setShowClasses] = useState(false)
  const [showTypes, setShowTypes] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)


  const handleOpenNewAssignment = () => {
    if (selectedSemester === 'all') {
      alert('Please select a semester before creating an assignment.')
      return
    }

    setShowAssignments(true)
  }

  const fetchAssignments = async () => {
    const { data, error } = await db.from('assignments').select('*, semesters(name)').eq('user_id', (await db.auth.getUser()).data.user?.id).order('due_date', { ascending: true })
    if (error) {
      console.error('Error fetching assignments:', error)
      return
    }
    setAssignments(data)
    console.log(data)
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  useEffect(() => {
    const fetchSemesters = async () => {
      const { data, error } = await db
        .from('semesters')
        .select('id, name')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error loading semesters:', error.message)
      } else if (data) {
        setSemesters(data)
      }
    }

    fetchSemesters()
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await db.auth.getUser()
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

  return (
    <main className="w-full min-h-screen bg-zinc-900 text-white px-2 sm:px-6 pb-6">
      <section className="w-full pt-6 px-2">
        <div className="space-y-6">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SemesterSelector selectedSemester={selectedSemester} setSelectedSemester={setSelectedSemester} semesters={semesters} />
              <Button variant="secondary" className="px-4 py-2 text-sm font-medium" onClick={() => setShowSemesters(true)}>Manage Semesters</Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                className="px-4 py-2 text-sm font-medium"
                onClick={() => {
                  if (selectedSemester === 'all') {
                    alert('Please select a semester before managing classes.')
                    return
                  }
                  setShowClasses(true)
                }}
              >
                Manage Classes
              </Button>
              <Button
                variant="secondary"
                className="px-4 py-2 text-sm font-medium"
                onClick={() => {
                  if (selectedSemester === 'all') {
                    alert('Please select a semester before managing types.')
                    return
                  }
                  setShowTypes(true)
                }}
              >
                Manage Types
              </Button>
              <Button variant="default" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700" onClick={handleOpenNewAssignment}>+ New Assignment</Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full text-center">
            <div className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 min-w-24">
              <div className="text-xs text-zinc-400">Total</div>
              <div className="text-lg font-bold text-white">{assignmentStats.total}</div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 min-w-24">
              <div className="text-xs text-zinc-400">Completed</div>
              <div className="text-lg font-bold text-white">{assignmentStats.completed}</div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 min-w-24">
              <div className="text-xs text-zinc-400">Pending</div>
              <div className="text-lg font-bold text-white">{assignmentStats.pending}</div>
            </div>
          </div>

          <AssignmentListView
            selectedSemester={selectedSemester}
            showCompleted={showCompleted}
            setShowCompleted={setShowCompleted}
            assignments={assignments}
            fetchAssignments={fetchAssignments}
            onEdit={(assignment) => {
              setEditingAssignment(assignment)
              setShowEditModal(true)
            }}
          />
        </div>
      </section>

      <Dialog open={showSemesters} onOpenChange={setShowSemesters}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Manage Semesters</DialogTitle>
          </DialogHeader>
          <Semesters semesters={semesters} setSemesters={setSemesters} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        {editingAssignment && (
          <EditAssignment
            currentAssignment={editingAssignment}
            onClose={() => setShowEditModal(false)}
            fetchAssignments={fetchAssignments}
          />
        )}
      </Dialog>


      <Dialog open={showAssignments} onOpenChange={setShowAssignments}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">New Assignment for {semesters.find(s => s.id === selectedSemester)?.name}</DialogTitle>
          </DialogHeader>
          <Assignments selectedSemester={selectedSemester} fetchAssignments={fetchAssignments} />
        </DialogContent>
      </Dialog>

      <Dialog open={showClasses} onOpenChange={setShowClasses}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Manage Classes for {semesters.find(s => s.id === selectedSemester)?.name}</DialogTitle>
          </DialogHeader>
          <Classes selectedSemester={selectedSemester} />
        </DialogContent>
      </Dialog>

      <Dialog open={showTypes} onOpenChange={setShowTypes}>
        <DialogContent className="bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Manage Types for {semesters.find(s => s.id === selectedSemester)?.name}</DialogTitle>
          </DialogHeader>
          <AssignmentTypes selectedSemester={selectedSemester} />
        </DialogContent>
      </Dialog>
    </main>
  )
}
