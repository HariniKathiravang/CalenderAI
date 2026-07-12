import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal, Table, PageHeader, FormField, Input, Button } from '../../components/ui'
import api from '../../services/api'

export default function AdminDepartments() {
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | dept object
  const [form, setForm] = useState({ department_name: '', department_code: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/departments/').then(r => { setDepts(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm({ department_name: '', department_code: '' }); setError(''); setModal('create') }
  const openEdit = (d) => { setForm({ department_name: d.department_name, department_code: d.department_code }); setError(''); setModal(d) }

  const save = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') {
        await api.post('/departments/', form)
      } else {
        await api.put(`/departments/${modal.id}`, form)
      }
      setModal(null); load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving')
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this department?')) return
    await api.delete(`/departments/${id}`)
    load()
  }

  const columns = [
    { key: 'department_name', label: 'Name' },
    { key: 'department_code', label: 'Code' },
    {
      key: 'actions', label: '',
      render: row => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(row.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${depts.length} departments`}
        action={<Button onClick={openCreate}><Plus size={14} /> Add Department</Button>}
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <Table columns={columns} data={depts} loading={loading} emptyMessage="No departments yet" />
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Department' : 'Edit Department'} size="sm">
        <div className="space-y-4">
          <FormField label="Department Name" required>
            <Input value={form.department_name} onChange={e => setForm(f => ({ ...f, department_name: e.target.value }))} placeholder="e.g. Computer Science and Engineering" />
          </FormField>
          <FormField label="Department Code" required>
            <Input value={form.department_code} onChange={e => setForm(f => ({ ...f, department_code: e.target.value }))} placeholder="e.g. CSE" />
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
