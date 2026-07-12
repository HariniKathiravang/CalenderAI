import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import {
  LayoutDashboard, Building2, BookOpen, Users, GraduationCap,
  UserCog, CalendarDays, CalendarRange
} from 'lucide-react'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/calendar', label: 'Calendar', icon: CalendarRange },
  { path: '/admin/events', label: 'Events', icon: CalendarDays },
  { path: '/admin/departments', label: 'Departments', icon: Building2 },
  { path: '/admin/classes', label: 'Classes', icon: BookOpen },
  { path: '/admin/hods', label: 'HODs', icon: UserCog },
  { path: '/admin/faculty', label: 'Faculty', icon: Users },
  { path: '/admin/students', label: 'Students', icon: GraduationCap },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar navItems={navItems} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
