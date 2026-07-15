import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun, Calendar } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Admin', hint: 'Username' },
  { value: 'hod', label: 'HOD', hint: 'Employee ID' },
  { value: 'faculty', label: 'Faculty', hint: 'Employee ID' },
  { value: 'student', label: 'Student', hint: 'Registration Number' },
]

// Inline animations
const animationStyles = `
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
  .animate-fadeInDown {
    animation: fadeInDown 0.6s ease-out;
  }
  .animate-fadeInUp {
    animation: fadeInUp 0.8s ease-out 0.2s both;
  }
  .button-3d {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.1);
  }
  .button-3d:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(37, 99, 235, 0.15);
  }
  .button-3d:active:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(37, 99, 235, 0.25), 0 0 0 1px rgba(37, 99, 235, 0.1);
  }
  .button-role {
    transition: all 0.3s ease;
  }
  .button-role:hover {
    transform: scale(1.05);
  }
  .input-field {
    transition: all 0.3s ease;
  }
  .input-field:focus {
    transform: scale(1.01);
  }
`

export default function LoginPage() {
  const [role, setRole] = useState('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const selectedRole = ROLES.find(r => r.value === role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(identifier, password, role)
      const paths = { admin: '/admin', hod: '/hod', faculty: '/faculty', student: '/student' }
      navigate(paths[user.role])
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <style>{animationStyles}</style>
      
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-110"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeInDown">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl mb-3 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Calendar size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">EEC Calendar</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">College Event Management System</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-700 p-8 animate-fadeInUp backdrop-blur-sm">
          {/* Role selector */}
          <div className="grid grid-cols-4 gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {ROLES.map((r, idx) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`py-1.5 text-xs font-medium rounded-md transition-all duration-300 button-role ${
                  role === r.value
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md transform scale-105'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} method="POST" className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {selectedRole?.hint}
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder={`Enter your ${selectedRole?.hint?.toLowerCase()}`}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm input-field shadow-sm hover:shadow-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm input-field shadow-sm hover:shadow-md"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 animate-fadeInUp">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm button-3d"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  )
}
