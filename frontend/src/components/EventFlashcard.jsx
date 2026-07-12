import React from 'react'
import { Calendar, Clock, MapPin, User, FileText, ChevronRight } from 'lucide-react'

export default function EventFlashcard({ event, onClose }) {
  if (!event) return null

  // Priority color accents
  const priorityColors = {
    HIGH: {
      border: 'border-red-500 dark:border-red-600',
      bg: 'bg-red-50 dark:bg-red-950/20',
      text: 'text-red-700 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      label: 'High Priority / Exam'
    },
    MEDIUM: {
      border: 'border-yellow-500 dark:border-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      label: 'Medium Priority'
    },
    STANDARD: {
      border: 'border-blue-500 dark:border-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      label: 'Standard Event'
    }
  }

  const priority = event.priority || 'STANDARD'
  const styles = priorityColors[priority] || priorityColors.STANDARD

  // Helper to construct backend URL for links
  const getBackendBaseUrl = () => {
    // Check if base URL has /api and remove it for static files
    const apiURL = window.location.origin.includes('localhost') ? 'http://localhost:8000' : ''
    return apiURL
  }

  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-l-4 ${styles.border} overflow-hidden max-w-md mx-auto`}>
      {/* Visual Accent Top Bar */}
      <div className={`h-1.5 ${styles.bg}`} />
      
      <div className="p-6 space-y-6">
        {/* Category & Close */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${styles.badge}`}>
            {styles.label}
          </span>
          {event.targets?.[0] && (
            <span className="text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {event.targets[0].target_type}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
            {event.title}
          </h2>
        </div>

        {/* Date and Time (Seamless Integration) */}
        <div className="space-y-3.5 text-gray-600 dark:text-gray-300 text-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">Date</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {event.event_date} {event.end_date && event.end_date !== event.event_date && (
                  <>
                    <span className="mx-1 text-gray-400">to</span>
                    {event.end_date}
                  </>
                )}
              </p>
            </div>
          </div>

          {(event.start_time || event.end_time) && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Time</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.start_time ? event.start_time.substring(0, 5) : '—'} 
                  {event.end_time && ` to ${event.end_time.substring(0, 5)}`}
                </p>
              </div>
            </div>
          )}

          {event.venue && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <MapPin className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Venue</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{event.venue}</p>
              </div>
            </div>
          )}

          {event.creator_name && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Organized By</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{event.creator_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description Section (Separated & Sleek) */}
        {event.description && (
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1.5">Details</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {/* Attachment Download */}
        {event.attachment_url && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <a
              href={event.attachment_url.startsWith('http') ? event.attachment_url : `${getBackendBaseUrl()}${event.attachment_url}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <FileText size={14} />
              <span>View Attachment / Reference Document</span>
              <ChevronRight size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
