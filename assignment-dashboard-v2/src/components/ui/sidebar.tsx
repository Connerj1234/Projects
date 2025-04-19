'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useLayoutEffect } from 'react'
import {
  LayoutDashboard,
  CalendarIcon,
  BookText,
  ClipboardList,
  AlarmClock,
  Menu,
} from 'lucide-react'
import SignOutButton from '@/components/ui/signout'

const navItems = [
  { name: 'Dashboard', href: '/main/.dashboard', icon: LayoutDashboard },
  { name: 'Assignments', href: '/main/assignments', icon: BookText },
  { name: 'To-Do List', href: '/main/todo', icon: ClipboardList },
  { name: 'Reminders', href: '/main/reminders', icon: AlarmClock },
  { name: 'Calendar', href: '/main/calendar', icon: CalendarIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useLayoutEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } min-h-screen flex flex-col bg-zinc-900 text-white transition-all duration-300`}
    >
      <div className={`flex ${collapsed ? 'justify-center' : 'justify-between'} items-center px-4 py-4 border-b border-zinc-800`}>
        {!collapsed && (
          <h1 className="text-lg font-bold whitespace-nowrap">Productivity Hub</h1>
        )}
        <button onClick={toggleSidebar}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="px-2 py-4 space-y-1">
        {navItems.map(({ name, href, icon: Icon }) => (
          <Link key={name} href={href}>
            <div
              className={`flex items-center ${
                collapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'
              } rounded-md text-sm font-medium cursor-pointer transition ${
                pathname === href
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {!collapsed && <span className="ml-3">{name}</span>}
            </div>
          </Link>
        ))}

        <SignOutButton collapsed={collapsed} />
      </nav>
    </aside>
  )
}
