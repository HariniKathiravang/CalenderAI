import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal, Table, PageHeader, FormField, Input, Select, Button, Badge } from '../../components/ui'
import api from '../../services/api'

const emptyForm = { username: '', password: '', registration_number: '', name: '', email: '', mobile_number: '', class_id: '' }

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/users/students'), api.get('/classes/')]).then(([s, c]) => {
      setStudents(s.data); setClasses(c.data); setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create') }
  const openEdit = (s) => {
    setForm({ username: s.user.username, password: '', registration_number: s.registration_number, name: s.name, email: s.email || '', mobile_number: s.mobile_number || '', class_id: s.class_id })
    setError(''); setModal(s)
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, class_id: Number(form.class_id) }
      if (modal === 'create') await api.post('/users/students', payload)
      else await api.put(`/users/students/${modal.id}`, payload)
      setModal(null); load()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this student?')) return
    await api.delete(`/users/students/${id}`)
    load()
  }

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.registration_number.toLowerCase().includes(search.toLowerCase())
    const matchClass = !filterClass || String(s.class_id) === filterClass
    return matchSearch && matchClass
  })

  const columns = [
    { key: 'registration_number', label: 'Reg. No.' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'class', label: 'Class', render: r => r.class_ ? `${r.class_.department?.department_code} Y${r.class_.year}-${r.class_.section}` : r.class_id },
    { key: 'status', label: '', render: r => <Badge color={r.user.is_active ? 'green' : 'red'}>{r.user.is_active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', label: '',
      render: row => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(row.id)} className="text-red-500"><Trash2 size={14} /></Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader title="Students" subtitle={`${students.length} students`}
        action={<Button onClick={openCreate}><Plus size={14} /> Add Student</Button>} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
          <input
            className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name or reg. number..." value={search} onChange={e => setSearch(e.target.value)} />
          <select
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.department?.department_code} Y{c.year}-{c.section}</option>)}
          </select>
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Student' : 'Edit Student'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Username" required>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={modal !== 'create'} />
            </FormField>
            <FormField label={modal === 'create' ? 'Password' : 'New Password'} required={modal === 'create'}>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Registration Number" required>
              <Input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} />
            </FormField>
            <FormField label="Name" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
            <FormField label="Mobile">
              <Input value={form.mobile_number} onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Class" required>
            <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.department?.department_code} Year {c.year} - {c.section}</option>)}
            </Select>
          </FormField>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
