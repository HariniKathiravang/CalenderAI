import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, MapPin, Clock, Paperclip } from 'lucide-react'
import { Modal, PageHeader, Button, Badge } from '../../components/ui'
import EventForm from '../../components/EventForm'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function HODEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const [deptId, setDeptId] = useState(null)

  useEffect(() => {
    api.get('/stats/hod').then(r => {
      // get dept_id via current user's hod profile - we'll fetch it from events context
    }).catch(() => {})
    load()
  }, [])

  const load = () => {
    setLoading(true)
    api.get('/events/').then(r => { setEvents(r.data); setLoading(false) }).catch(() => setLoading(false))
  }

  const handleCreate = async (payload) => {
    await api.post('/events/', payload)
    setModal(null); load()
  }

  const handleUpdate = async (payload) => {
    await api.put(`/events/${modal.id}`, payload)
    setModal(null); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return
    await api.delete(`/events/${id}`)
    load()
  }

  const targetColor = (type) => ({ COLLEGE: 'purple', DEPARTMENT: 'blue', CLASS: 'green' })[type] || 'gray'
  const filtered = events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader title="Events" subtitle="Department & class events"
        action={<Button onClick={() => setModal('create')}><Plus size={14} /> Create Event</Button>} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No events found</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(e => (
              <div key={e.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</h3>
                    {e.targets?.map((t, i) => <Badge key={i} color={targetColor(t.target_type)}>{t.target_type}</Badge>)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span>{e.event_date}</span>
                    {e.start_time && <span className="flex items-center gap-1"><Clock size={11} />{e.start_time}</span>}
                    {e.venue && <span className="flex items-center gap-1"><MapPin size={11} />{e.venue}</span>}
                    {e.attachment_url && (
                      <a href={`${api.defaults.baseURL.replace('/api', '')}${e.attachment_url}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
                        <Paperclip size={11} /> Attachment
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setModal(e)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="text-red-500"><Trash2 size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Create Event' : 'Edit Event'}>
        <EventForm
          initial={modal !== 'create' ? modal : null}
          onSubmit={modal === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setModal(null)}
          userRole={user?.role}
        />
      </Modal>
    </div>
  )
}
