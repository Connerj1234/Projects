'use client'

import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'

export type ViewMode = 'list' | 'calendar'

type Props = {
  showCompleted: boolean
  setShowCompleted: (val: boolean) => void
  onManageClasses: () => void
  onManageTypes: () => void
  stats: { total: number; completed: number; pending: number }
  viewMode: ViewMode
  setViewMode: (view: ViewMode) => void
}

export default function DashboardControls({
  showCompleted,
  setShowCompleted,
  onManageClasses,
  onManageTypes,
  stats,
  viewMode,
  setViewMode,
}: Props) {

  useEffect(() => {
    const savedView = localStorage.getItem('viewMode')
    if (savedView === 'calendar' || savedView === 'list') {
      setViewMode(savedView)
    }
    }, [])

  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Toggle
            pressed={viewMode === 'list'}
            onPressedChange={() => {
              setViewMode('list')
              localStorage.setItem('viewMode', 'list')
            }}
          >
            📋 List
          </Toggle>
          <Toggle
            pressed={viewMode === 'calendar'}
            onPressedChange={() => {
              setViewMode('calendar')
              localStorage.setItem('viewMode', 'calendar')
            }}
          >
            🗓 Calendar
          </Toggle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">Show Completed</span>
            <Switch id="show-completed" className="border border-zinc-700" checked={showCompleted} onCheckedChange={setShowCompleted} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onManageClasses}>
            ⚙️ Manage Classes
          </Button>
          <Button variant="secondary" onClick={onManageTypes}>
            🏷 Manage Types
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="text-sm text-zinc-400">Total Assignments</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="text-sm text-zinc-400">Completed</div>
          <div className="text-2xl font-bold text-white">{stats.completed}</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="text-sm text-zinc-400">Pending</div>
          <div className="text-2xl font-bold text-white">{stats.pending}</div>
        </div>
      </div>
    </div>
  )
}
