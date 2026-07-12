import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal, Table, PageHeader, FormField, Input, Select, Button, Badge } from '../../components/ui'
import api from '../../services/api'

const emptyForm = { username: '', password: '', employee_id: '', name: '', email: '', mobile_number: '', department_id: '' }

export default function AdminHODs() {
  const [hods, setHods] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/users/hods'), api.get('/departments/')]).then(([h, d]) => {
      setHods(h.data); setDepts(d.data); setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create') }
  const openEdit = (h) => {
    setForm({ username: h.user.username, password: '', employee_id: h.employee_id, name: h.name, email: h.email || '', mobile_number: h.mobile_number || '', department_id: h.department_id })
    setError(''); setModal(h)
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, department_id: Number(form.department_id) }
      if (modal === 'create') await api.post('/users/hods', payload)
      else await api.put(`/users/hods/${modal.id}`, payload)
      setModal(null); load()
    } catch (err) { setError(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this HOD?')) return
    await api.delete(`/users/hods/${id}`)
    load()
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'dept', label: 'Department', render: r => r.department?.department_code || '' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: r => <Badge color={r.user.is_active ? 'green' : 'red'}>{r.user.is_active ? 'Active' : 'Inactive'}</Badge> },
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
      <PageHeader title="HODs" subtitle={`${hods.length} HODs`}
        action={<Button onClick={openCreate}><Plus size={14} /> Add HOD</Button>} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Table columns={columns} data={hods} loading={loading} />
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add HOD' : 'Edit HOD'}>
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
          <FormField label="Department" required>
            <Select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">Select department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
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
