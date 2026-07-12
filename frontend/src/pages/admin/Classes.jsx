import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal, Table, PageHeader, FormField, Input, Select, Button } from '../../components/ui'
import api from '../../services/api'

export default function AdminClasses() {
  const [classes, setClasses] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ department_id: '', year: '', section: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/classes/'), api.get('/departments/')]).then(([c, d]) => {
      setClasses(c.data); setDepts(d.data); setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm({ department_id: '', year: '', section: '' }); setError(''); setModal('create') }
  const openEdit = (c) => { setForm({ department_id: c.department_id, year: c.year, section: c.section }); setError(''); setModal(c) }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, department_id: Number(form.department_id), year: Number(form.year) }
      if (modal === 'create') await api.post('/classes/', payload)
      else await api.put(`/classes/${modal.id}`, payload)
      setModal(null); load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error')
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this class?')) return
    await api.delete(`/classes/${id}`)
    load()
  }

  const columns = [
    { key: 'dept', label: 'Department', render: r => r.department?.department_name || r.department_id },
    { key: 'year', label: 'Year' },
    { key: 'section', label: 'Section' },
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
      <PageHeader title="Classes" subtitle={`${classes.length} classes`}
        action={<Button onClick={openCreate}><Plus size={14} /> Add Class</Button>} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Table columns={columns} data={classes} loading={loading} />
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Class' : 'Edit Class'} size="sm">
        <div className="space-y-4">
          <FormField label="Department" required>
            <Select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">Select department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </Select>
          </FormField>
          <FormField label="Year" required>
            <Select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
              <option value="">Select year</option>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </Select>
          </FormField>
          <FormField label="Section" required>
            <Input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="A, B, C..." />
          </FormField>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
