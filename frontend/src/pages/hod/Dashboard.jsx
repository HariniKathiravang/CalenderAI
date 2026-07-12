import { useState, useEffect } from 'react'
import { Users, GraduationCap, CalendarDays, BookOpen } from 'lucide-react'
import { StatCard, PageHeader, Modal } from '../../components/ui'
import EventFlashcard from '../../components/EventFlashcard'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function HODDashboard() {
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    api.get('/stats/hod').then(r => setStats(r.data)).catch(() => {})
    const today = new Date().toISOString().split('T')[0]
    api.get(`/events/?start_date=${today}`).then(r => setEvents(r.data.slice(0, 8))).catch(() => {})
  }, [])

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name}`} subtitle={stats?.department_name || 'Department Overview'} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Classes" value={stats?.total_classes} icon={BookOpen} color="blue" />
        <StatCard label="Faculty" value={stats?.total_faculty} icon={Users} color="green" />
        <StatCard label="Students" value={stats?.total_students} icon={GraduationCap} color="orange" />
        <StatCard label="Upcoming Events" value={stats?.upcoming_events} icon={CalendarDays} color="purple" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No upcoming events</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto scrollbar-thin">
            {events.map(e => (
              <div 
                key={e.id} 
                className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                onClick={() => setSelectedEvent(e)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                  <p className="text-xs text-gray-400">{e.event_date}{e.venue && ` · ${e.venue}`}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                  e.targets?.[0]?.target_type === 'COLLEGE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  e.targets?.[0]?.target_type === 'DEPARTMENT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>{e.targets?.[0]?.target_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <Modal 
          open={!!selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          title="Event Card" 
          size="sm"
        >
          <EventFlashcard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </Modal>
      )}
    </div>
  )
}
