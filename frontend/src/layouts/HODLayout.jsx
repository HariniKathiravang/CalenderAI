import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { LayoutDashboard, CalendarRange, CalendarDays, Users, GraduationCap } from 'lucide-react'

const hodNav = [
  { path: '/hod', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/hod/calendar', label: 'Calendar', icon: CalendarRange },
  { path: '/hod/events', label: 'Events', icon: CalendarDays },
  { path: '/hod/faculty', label: 'Faculty', icon: Users },
  { path: '/hod/students', label: 'Students', icon: GraduationCap },
]

const facultyNav = [
  { path: '/faculty', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/faculty/calendar', label: 'Calendar', icon: CalendarRange },
  { path: '/faculty/events', label: 'Events', icon: CalendarDays },
  { path: '/faculty/students', label: 'My Students', icon: GraduationCap },
]

const studentNav = [
  { path: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/student/calendar', label: 'Calendar', icon: CalendarRange },
  { path: '/student/notifications', label: 'Notifications', icon: CalendarDays },
]

function Layout({ navItems }) {
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

export function HODLayout() { return <Layout navItems={hodNav} /> }
export function FacultyLayout() { return <Layout navItems={facultyNav} /> }
export function StudentLayout() { return <Layout navItems={studentNav} /> }

export default HODLayout
