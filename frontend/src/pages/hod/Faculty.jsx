import { useState, useEffect } from 'react'
import { Table, PageHeader, Badge } from '../../components/ui'
import api from '../../services/api'

export default function HODFaculty() {
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/users/faculty').then(r => { setFaculty(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = faculty.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'class', label: 'Assigned Class', render: r => r.assigned_class ? `Year ${r.assigned_class.year} - ${r.assigned_class.section}` : '—' },
    { key: 'email', label: 'Email' },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'status', label: '', render: r => <Badge color={r.user.is_active ? 'green' : 'red'}>{r.user.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Faculty" subtitle={`${faculty.length} faculty members in your department`} />
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
