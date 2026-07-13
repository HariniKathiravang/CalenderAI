import { useState, useEffect } from 'react'
import CalendarView from '../../components/CalendarView'
import { Table, PageHeader, Badge, Modal, FormField, Input, Button } from '../../components/ui'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

const emptyForm = { username: '', password: '', registration_number: '', name: '', email: '', mobile_number: '' }

export function FacultyStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/users/students').then(r => { setStudents(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create') }
  const openEdit = (s) => {
    setForm({ 
      username: s.user.username, 
      password: '', 
      registration_number: s.registration_number, 
      name: s.name, 
      email: s.email || '', 
      mobile_number: s.mobile_number || '' 
    })
    setError(''); setModal(s)
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = { 
        ...form
      }
      delete payload.class_id
      if (modal === 'create') await api.post('/users/students', payload)
      else await api.put(`/users/students/${modal.id}`, payload)
      setModal(null); load()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this student?')) return
    try {
      await api.delete(`/users/students/${id}`)
      load()
    } catch (err) { alert(err.response?.data?.detail || 'Error deleting student') }
  }

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
    {
      key: 'actions', label: '',
      render: row => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(row.id)} className="text-red-500"><Trash2 size={14} /></Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader 
        title="My Students" 
        subtitle={`${students.length} students in your class`}
        action={<Button onClick={openCreate}><Plus size={14} /> Add Student</Button>}
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
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

export default FacultyCalendar
