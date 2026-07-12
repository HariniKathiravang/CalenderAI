import { useState, useEffect, useRef } from 'react'
import { Menu, Sun, Moon, Bell, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [showUser, setShowUser] = useState(false)
  const notifRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnread = async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnread(res.data.count)
    } catch {}
  }

  const openNotifs = async () => {
    setShowNotifs(!showNotifs)
    if (!showNotifs) {
      try {
        const res = await api.get('/notifications/')
        setNotifs(res.data)
      } catch {}
    }
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read')
      setUnread(0)
      setNotifs(notifs.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleBadgeColors = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    hod: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    faculty: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    student: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifs}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                ) : (
                  notifs.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${
                        !n.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-900 dark:text-white leading-none">{user?.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${roleBadgeColors[user?.role]}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
