import { useState, useEffect } from 'react'
import { FormField, Input, Textarea, Select, Button } from './ui'
import api, { getBackendBaseUrl } from '../services/api'

export default function EventForm({ initial, onSubmit, onCancel, userRole, userDeptId, userClassId }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    event_date: initial?.event_date || '',
    start_time: initial?.start_time || '',
    end_time: initial?.end_time || '',
    venue: initial?.venue || '',
    target_type: initial?.targets?.[0]?.target_type || (userRole === 'admin' ? 'COLLEGE' : userRole === 'hod' ? 'DEPARTMENT' : 'CLASS'),
    target_id: initial?.targets?.[0]?.target_id || null,
  })
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => {
    if (userRole === 'admin') {
      api.get('/departments/').then(r => setDepartments(r.data)).catch(() => {})
      api.get('/classes/').then(r => setClasses(r.data)).catch(() => {})
    } else if (userRole === 'hod') {
      api.get('/classes/').then(r => setClasses(r.data)).catch(() => {})
    }
  }, [userRole])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let attachment_url = initial?.attachment_url || null
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await api.post('/events/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        attachment_url = uploadRes.data.file_url
      }

      const targets = [{
        target_type: form.target_type,
        target_id: form.target_type === 'COLLEGE' ? null : form.target_id ? Number(form.target_id) : null,
      }]
      const payload = {
        title: form.title,
        description: form.description || null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        venue: form.venue || null,
        targets,
        attachment_url,
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const targetOptions = () => {
    if (userRole === 'admin') return ['COLLEGE', 'DEPARTMENT', 'CLASS']
    if (userRole === 'hod') return ['DEPARTMENT', 'CLASS']
    return ['CLASS']
  }



  return (
    <form onSubmit={handleSubmit} method="POST" className="space-y-4">
      {/* Prioritized File/Image Upload Section */}
      <div className="bg-blue-50/30 dark:bg-gray-800/50 p-4 rounded-xl border border-blue-100/60 dark:border-gray-700/60 space-y-2">
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Upload circular or event document (Image/PDF)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Drop your document here. It will attach to the event (standard parser connected; LLM-parsing ready).
        </p>
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            dark:file:bg-gray-700 dark:file:text-gray-200 cursor-pointer"
        />
        {initial?.attachment_url && (
          <p className="text-xs text-gray-500 mt-1">
            Current attachment: <a href={`${getBackendBaseUrl()}${initial.attachment_url}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View Current Attachment</a>
          </p>
        )}
      </div>

      {/* Manual Entry Fallback Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-gray-150 dark:border-gray-700"></div>
        <span className="flex-shrink mx-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Or Enter Details Manually
        </span>
        <div className="flex-grow border-t border-gray-150 dark:border-gray-700"></div>
      </div>

      {/* Manual Entry Fields */}
      <FormField label="Title" required>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" required />
      </FormField>

      <FormField label="Description">
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date" required>
          <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required />
        </FormField>
        <FormField label="Venue">
          <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Location" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start Time">
          <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
        </FormField>
        <FormField label="End Time">
          <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
        </FormField>
      </div>

      <FormField label="Visibility" required>
        <Select value={form.target_type} onChange={e => setForm(f => ({ ...f, target_type: e.target.value, target_id: null }))}>
          {targetOptions().map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </FormField>

      {form.target_type === 'DEPARTMENT' && userRole === 'admin' && (
        <FormField label="Department" required>
          <Select value={form.target_id || ''} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
          </Select>
        </FormField>
      )}

      {form.target_type === 'CLASS' && (
        <FormField label="Class" required>
          <Select value={form.target_id || ''} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}>
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.department?.department_code} Year {c.year} - {c.section}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Event'}</Button>
      </div>
    </form>
  )
}

