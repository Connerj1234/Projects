import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

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

type Props = {
  open: boolean
  onClose: () => void
  date: Date | null
  assignments: Assignment[]
  onToggleComplete: (id: string, completed: boolean) => void
  onEdit: (assignment: Assignment) => void
  onDelete: (id: string) => void
  classMap: Record<string, { name: string; color: string }>
  typeMap: Record<string, { name: string; color: string }>
  refreshAssignments: () => void
}

function getDaysAway(dateString: string) {
    const utcDate = new Date(dateString);

    const localDue = new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = localDue.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '(Today)';
    if (diffDays === 1) return '(Tomorrow)';
    if (diffDays < 0) return `(${Math.abs(diffDays)} days ago)`;
    return ` ${diffDays} days away`;
  }

export default function DayAssignmentModal({
    open,
    onClose,
    date,
    assignments,
    onToggleComplete,
    onEdit,
    onDelete,
    classMap,
    typeMap,
    refreshAssignments,
}: Props) {
  const [dayAssignments, setDayAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const filtered = assignments.filter((a) => a.due_date?.startsWith(dateStr))
      setDayAssignments(filtered)
    }
  }, [date, assignments])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-white text-xl">
              Assignments on {date ? format(date, 'MMMM d, yyyy') : ''}
            </DialogTitle>
            <span className="bg-zinc-700 text-white text-xs px-2 py-0.5 rounded-full">
              {getDaysAway(date ? format(date, 'yyyy-MM-dd') : '')}
            </span>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {dayAssignments.length === 0 ? (
            <p className="text-sm text-zinc-400">No assignments due.</p>
          ) : (
            dayAssignments.map((a) => (
              <div
                key={a.id}
                className="bg-zinc-800 p-3 rounded border border-zinc-700 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={a.completed}
                      onChange={async () => {
                        await supabase
                          .from('assignments')
                          .update({ completed: !a.completed })
                          .eq('id', a.id)
                        refreshAssignments();
                      }}
                      className="form-checkbox h-4 w-4"
                    />
                    <span className={cn('font-medium text-white', a.completed && 'line-through opacity-60')}>{a.title}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => onEdit(a)}>
                      <Pencil className="h-4 w-4 text-blue-400 hover:text-blue-500" />
                    </button>
                    <button onClick={async () => {
                    if (confirm(`Delete "${a.title}"?`)) {
                      await supabase.from('assignments').delete().eq('id', a.id)
                      refreshAssignments();
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                  </button>
                  </div>
                </div>

                {a.notes && <p className="text-sm text-zinc-400 ml-6">{a.notes}</p>}

                <div className="flex flex-wrap gap-2 ml-6">
                  {classMap[a.class_id] && (
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: classMap[a.class_id].color }}
                    >
                      {classMap[a.class_id].name}
                    </span>
                  )}
                  {typeMap[a.type_id] && (
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: typeMap[a.type_id].color }}
                    >
                      {typeMap[a.type_id].name}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
