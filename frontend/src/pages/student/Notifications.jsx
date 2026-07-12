import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { PageHeader, Button } from '../../components/ui'
import api from '../../services/api'

export default function StudentNotifications() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/notifications/').then(r => { setNotifs(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const markAllRead = async () => {
    await api.put('/notifications/mark-all-read')
    load()
  }

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`)
    setNotifs(n => n.map(notif => notif.id === id ? { ...notif, is_read: true } : notif))
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        action={unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Bell size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifs.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!n.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
              >
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
