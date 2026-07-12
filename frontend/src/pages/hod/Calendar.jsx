import { useState, useEffect } from 'react'
import CalendarView from '../../components/CalendarView'
import { PageHeader } from '../../components/ui'
import api from '../../services/api'

export default function HODCalendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/events/').then(r => { setEvents(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Department calendar" />
      {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        : <CalendarView events={events} />}
    </div>
  )
}
