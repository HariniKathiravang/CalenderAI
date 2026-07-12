import { useState, useEffect } from 'react'
import { GraduationCap, CalendarDays, BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { StatCard, PageHeader, Modal } from '../../components/ui'
import EventFlashcard from '../../components/EventFlashcard'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null) // YYYY-MM-DD string filter
  const [selectedEvent, setSelectedEvent] = useState(null)
  const { user } = useAuth()

  // Mini Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    api.get('/stats/faculty').then(r => setStats(r.data)).catch(() => {})
    const today = new Date().toISOString().split('T')[0]
    // Fetch upcoming events for list
    api.get(`/events/?start_date=${today}`).then(r => setEvents(r.data)).catch(() => {})
    // Fetch all events for calendar color-coding
    api.get('/events/').then(r => setAllEvents(r.data)).catch(() => {})
  }, [])

  // Priority color-coding map
  const priorityMap = {}
  allEvents.forEach(e => {
    const dateStr = e.event_date
    const current = priorityMap[dateStr]
    if (!current || e.priority === 'HIGH' || (e.priority === 'MEDIUM' && current === 'STANDARD')) {
      priorityMap[dateStr] = e.priority
    }
  })

  // Calendar dates generation
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1)
    const days = []
    const firstDayIndex = date.getDay()
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null)
    }
    while (date.getMonth() === month) {
      days.push(new Date(date))
      date.setDate(date.getDate() + 1)
    }
    return days
  }

  const days = getDaysInMonth(currentYear, currentMonth)

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  // Filter events based on selection
  const filteredEvents = selectedDate
    ? events.filter(e => e.event_date === selectedDate)
    : events.slice(0, 6)

  const handleDateClick = (d) => {
    if (!d) return
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    if (selectedDate === dateStr) {
      setSelectedDate(null) // toggle clear
    } else {
      setSelectedDate(dateStr)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.name}`} subtitle="Your class and academic schedule overview" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Students in Class" value={stats?.student_count} icon={GraduationCap} color="orange" />
        <StatCard label="Upcoming Events" value={stats?.upcoming_events} icon={CalendarDays} color="blue" />
        <StatCard label="Class ID" value={stats?.class_id ? `#${stats.class_id}` : '—'} icon={BookOpen} color="green" />
      </div>

      {/* Dashboard Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Classes Grid (Modular Class View) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assigned Classes & Departments</h2>
          {stats?.assigned_classes?.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
              No classes assigned to your department.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats?.assigned_classes?.map(cls => (
                <div 
                  key={cls.id} 
                  className={`relative p-5 rounded-xl border bg-white dark:bg-gray-800 transition-shadow hover:shadow-md ${
                    cls.is_assigned 
                      ? 'border-blue-500 dark:border-blue-600 ring-1 ring-blue-500/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded uppercase">
                        Year {cls.year}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">
                        Section {cls.section}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cls.department_name} ({cls.department_code})
                      </p>
                    </div>
                    {cls.is_assigned && (
                      <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">
                        Class Advisor
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Students</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{cls.student_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Upcoming Events</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{cls.upcoming_events}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Mini Calendar + Upcoming Events list */}
        <div className="space-y-6">
          
          {/* Mini Calendar Component */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <div className="flex gap-1">
                <button 
                  onClick={prevMonth} 
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={nextMonth} 
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="h-6 flex items-center justify-center">{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {days.map((d, idx) => {
                if (!d) return <div key={idx} className="h-8" />
                
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const dateNum = String(d.getDate()).padStart(2, '0')
                const dateStr = `${year}-${month}-${dateNum}`
                
                const isSelected = selectedDate === dateStr
                const priority = priorityMap[dateStr]
                
                // Color dots depending on event priority
                let dotClass = ''
                if (priority === 'HIGH') dotClass = 'bg-red-500 dark:bg-red-400'
                else if (priority === 'MEDIUM') dotClass = 'bg-yellow-500 dark:bg-yellow-400'
                else if (priority === 'STANDARD') dotClass = 'bg-blue-500 dark:bg-blue-400'

                // Check if today
                const isToday = new Date().toDateString() === d.toDateString()

                return (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(d)}
                    className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center relative hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-semibold ${
                      isSelected 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : isToday 
                          ? 'border border-blue-500/50 text-blue-600 dark:text-blue-400' 
                          : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <span className="relative z-10">{d.getDate()}</span>
                    {priority && !isSelected && (
                      <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full ${
                        priority === 'HIGH' ? 'bg-red-500/15 border border-red-500/20 text-red-700 dark:text-red-400' :
                        priority === 'MEDIUM' ? 'bg-yellow-500/15 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                        'bg-blue-500/15 border border-blue-500/20 text-blue-700 dark:text-blue-400'
                      }`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upcoming Events list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {selectedDate ? 'Events on Selected Date' : 'Upcoming Events'}
              </h2>
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                {selectedDate ? 'No events scheduled for this day' : 'No upcoming events'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto scrollbar-thin">
                {filteredEvents.map(e => (
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
        </div>

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

