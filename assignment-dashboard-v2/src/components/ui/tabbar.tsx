'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, FileText, CalendarDays, AlarmClock, LayoutDashboard } from 'lucide-react'

export default function TabBar() {
  const pathname = usePathname()

  const tabs = [
    { label: 'Dashboard', href: '/main/.dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Assignments', href: '/main/assignments', icon: <FileText className="h-4 w-4" /> },
    { label: 'To-Do List', href: '/main/todo', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Reminders', href: '/main/reminders', icon: <AlarmClock className="h-4 w-4" /> },
    { label: 'Calendar', href: '/main/calendar', icon: <CalendarDays className="h-4 w-4" /> },
  ]

  return (
    <div className="w-full flex justify-center">
      <div className="flex rounded-md bg-zinc-700 p-1">
        {tabs.map(({ label, href, icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${
                isActive
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {icon}
              <span className="font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
