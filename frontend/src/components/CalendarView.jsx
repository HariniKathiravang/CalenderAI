import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { Modal } from './ui'
import { MapPin, Clock, User, CalendarDays } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import EventFlashcard from './EventFlashcard'

export default function CalendarView({ events }) {
  const [selected, setSelected] = useState(null)
  const { user } = useAuth()

  const calendarEvents = events.map(e => ({
    id: String(e.id),
    title: e.title,
    date: e.event_date,
    extendedProps: e,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  }))

  function renderEventContent(eventInfo) {
    const e = eventInfo.event.extendedProps
    const targetType = e.targets?.[0]?.target_type

    let colorClass = ''
    if (targetType === 'COLLEGE') {
      colorClass = 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800'
    } else if (targetType === 'DEPARTMENT') {
      colorClass = 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
    } else {
      colorClass = 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800'
    }

    return (
      <div className={`w-full px-2 py-1 text-xs rounded border-l-2 truncate font-medium ${colorClass} shadow-sm border`}>
        {e.start_time && <span className="mr-1 opacity-75">{e.start_time.substring(0, 5)}</span>}
        {eventInfo.event.title}
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" />College
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />Department
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" />Class
          </span>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          events={calendarEvents}
          eventClick={({ event }) => setSelected(event.extendedProps)}
          eventContent={renderEventContent}
          height="auto"
          dayMaxEventRows={true}
        />
      </div>

      {selected && (
        <Modal 
          open={!!selected} 
          onClose={() => setSelected(null)} 
          title="Event Card" 
          size="sm"
        >
          <EventFlashcard event={selected} onClose={() => setSelected(null)} />
        </Modal>
      )}
    </>
  )
}

