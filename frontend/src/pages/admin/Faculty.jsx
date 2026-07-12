import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal, Table, PageHeader, FormField, Input, Select, Button, Badge } from '../../components/ui'
import api from '../../services/api'

const emptyForm = { username: '', password: '', employee_id: '', name: '', email: '', mobile_number: '', department_id: '', class_id: '', designation: '' }

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([])
  const [depts, setDepts] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/users/faculty'), api.get('/departments/'), api.get('/classes/')]).then(([f, d, c]) => {
      setFaculty(f.data); setDepts(d.data); setClasses(c.data); setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create') }
  const openEdit = (f) => {
    setForm({ username: f.user.username, password: '', employee_id: f.employee_id, name: f.name, email: f.email || '', mobile_number: f.mobile_number || '', department_id: f.department_id, class_id: f.class_id || '', designation: f.designation || '' })
    setError(''); setModal(f)
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, department_id: Number(form.department_id), class_id: form.class_id ? Number(form.class_id) : null }
      if (modal === 'create') await api.post('/users/faculty', payload)
      else await api.put(`/users/faculty/${modal.id}`, payload)
      setModal(null); load()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this faculty member?')) return
    await api.delete(`/users/faculty/${id}`)
    load()
  }

  const filtered = faculty.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  const filteredClasses = form.department_id
    ? classes.filter(c => c.department_id === Number(form.department_id))
    : classes

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'designation', label: 'Designation' },
    { key: 'dept', label: 'Dept', render: r => r.department?.department_code || '' },
    { key: 'class', label: 'Class', render: r => r.assigned_class ? `Year ${r.assigned_class.year}-${r.assigned_class.section}` : '—' },
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
      <PageHeader title="Faculty" subtitle={`${faculty.length} members`}
        action={<Button onClick={openCreate}><Plus size={14} /> Add Faculty</Button>} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Faculty' : 'Edit Faculty'}>
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
            <FormField label="Employee ID" required>
              <Input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department" required>
              <Select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value, class_id: '' }))}>
                <option value="">Select department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Designation">
              <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Professor" />
            </FormField>
          </div>
          <FormField label="Assigned Class">
            <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">None</option>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.department?.department_code} Year {c.year} - {c.section}</option>)}
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
