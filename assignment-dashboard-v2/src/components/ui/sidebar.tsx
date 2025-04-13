'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarIcon,
  BookText,
  ClipboardList,
  AlarmClock,
  Menu,
  LogOut,
} from 'lucide-react'
import SignOutButton from '@/components/ui/signout'

const navItems = [
  { name: 'Dashboard', href: '/main/dashboard', icon: LayoutDashboard },
  { name: 'Assignments', href: '/main/assignments', icon: BookText },
  { name: 'To-Do List', href: '/main/todo', icon: ClipboardList },
  { name: 'Reminders', href: '/main/reminders', icon: AlarmClock },
  { name: 'Calendar', href: '/main/calendar', icon: CalendarIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } h-screen flex flex-col bg-zinc-900 text-white transition-all duration-300`}
    >
      {/* Top Section with Toggle */}
      <div>
        <div
          className={`flex ${
            collapsed ? 'justify-center' : 'justify-between'
          } items-center px-4 py-4 border-b border-zinc-800`}
        >
          {!collapsed && (
            <h1 className="text-lg font-bold whitespace-nowrap">Productivity Hub</h1>
          )}
          <button onClick={() => setCollapsed(!collapsed)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={`px-2 py-4 space-y-1`}>
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

          {/* Sign Out Button directly below nav items */}
          <button
            onClick={() => {
              const confirmSignOut = confirm('Are you sure you want to sign out?')
              if (confirmSignOut) {
                document.getElementById('signout-button')?.click()
              }
            }}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'
            } mt-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 transition`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="ml-3">Sign Out</span>}
          </button>
        </nav>
      </div>

      {/* Hidden signout trigger */}
      <div className="hidden">
        <SignOutButton id="signout-button" />
      </div>
    </aside>
  )
}
