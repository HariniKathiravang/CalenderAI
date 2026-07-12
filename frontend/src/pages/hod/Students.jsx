import { useState, useEffect } from 'react'
import { Table, PageHeader, Badge } from '../../components/ui'
import api from '../../services/api'

export default function HODStudents() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')

  useEffect(() => {
    Promise.all([api.get('/users/students'), api.get('/classes/')]).then(([s, c]) => {
      setStudents(s.data); setClasses(c.data); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.registration_number.toLowerCase().includes(search.toLowerCase())
    const matchClass = !filterClass || String(s.class_id) === filterClass
    return matchSearch && matchClass
  })

  const columns = [
    { key: 'registration_number', label: 'Reg. No.' },
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class', render: r => r.class_ ? `Year ${r.class_.year} - ${r.class_.section}` : r.class_id },
    { key: 'email', label: 'Email' },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'status', label: '', render: r => <Badge color={r.user.is_active ? 'green' : 'red'}>{r.user.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Students" subtitle={`${students.length} students in your department`} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
          <input className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>Year {c.year} - {c.section}</option>)}
          </select>
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </div>
    </div>
  )
}
