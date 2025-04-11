import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Assignment } from '@/types'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  date: Date | null
  assignments: Assignment[]
  selectedSemester: string
  onToggleComplete: (assignmentId: string, completed: boolean) => void
  onEdit: (assignment: Assignment) => void
  onDelete: (assignmentId: string) => void
  classMap: Record<string, { name: string; color: string }>
  typeMap: Record<string, { name: string; color: string }>
}

export default function DayAssignmentModal({
  open,
  onClose,
  date,
  assignments,
  selectedSemester,
  onToggleComplete,
  onEdit,
  onDelete,
  classMap,
  typeMap,
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
          <DialogTitle className="text-white text-xl">
            Assignments on {date ? format(date, 'MMMM d, yyyy') : ''}
          </DialogTitle>
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
                      onChange={() => onToggleComplete(a.id, !a.completed)}
                      className="form-checkbox h-4 w-4"
                    />
                    <span className={cn('font-medium text-white', a.completed && 'line-through opacity-60')}>{a.title}</span>
                  </label>
                  <div className="flex gap-2">
                    <Pencil
                      className="w-4 h-4 text-zinc-400 hover:text-white cursor-pointer"
                      onClick={() => onEdit(a)}
                    />
                    <Trash2
                      className="w-4 h-4 text-red-500 hover:text-red-400 cursor-pointer"
                      onClick={() => onDelete(a.id)}
                    />
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
