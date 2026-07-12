import { useState, useEffect } from 'react'
import CalendarView from '../../components/CalendarView'
import { Table, PageHeader, Badge } from '../../components/ui'
import api from '../../services/api'

export function FacultyCalendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/events/').then(r => { setEvents(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Your class events" />
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : <CalendarView events={events} />}
    </div>
  )
}

export function FacultyStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/users/students').then(r => { setStudents(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.registration_number.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'registration_number', label: 'Reg. No.' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'status', label: '', render: r => <Badge color={r.user.is_active ? 'green' : 'red'}>{r.user.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="My Students" subtitle={`${students.length} students in your class`} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </div>
    </div>
  )
}

export default FacultyCalendar
