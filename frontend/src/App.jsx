import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import AdminLayout from './layouts/AdminLayout'
import HODLayout from './layouts/HODLayout'
import FacultyLayout from './layouts/FacultyLayout'
import StudentLayout from './layouts/StudentLayout'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminDepartments from './pages/admin/Departments'
import AdminClasses from './pages/admin/Classes'
import AdminHODs from './pages/admin/HODs'
import AdminFaculty from './pages/admin/Faculty'
import AdminStudents from './pages/admin/Students'
import AdminEvents from './pages/admin/Events'
import AdminCalendar from './pages/admin/Calendar'

// HOD pages
import HODDashboard from './pages/hod/Dashboard'
import HODEvents from './pages/hod/Events'
import HODCalendar from './pages/hod/Calendar'
import HODFaculty from './pages/hod/Faculty'
import HODStudents from './pages/hod/Students'

// Faculty pages
import FacultyDashboard from './pages/faculty/Dashboard'
import FacultyEvents from './pages/faculty/Events'
import FacultyCalendar from './pages/faculty/Calendar'
import FacultyStudents from './pages/faculty/Students'

// Student pages
import StudentDashboard from './pages/student/Dashboard'
import StudentCalendar from './pages/student/Calendar'
import StudentNotifications from './pages/student/Notifications'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/login" replace />
  return children
}

function RoleRouter() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const paths = { admin: '/admin', hod: '/hod', faculty: '/faculty', student: '/student' }
  return <Navigate to={paths[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RoleRouter />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="hods" element={<AdminHODs />} />
              <Route path="faculty" element={<AdminFaculty />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="calendar" element={<AdminCalendar />} />
            </Route>

            {/* HOD routes */}
            <Route path="/hod" element={<ProtectedRoute role="hod"><HODLayout /></ProtectedRoute>}>
              <Route index element={<HODDashboard />} />
              <Route path="events" element={<HODEvents />} />
              <Route path="calendar" element={<HODCalendar />} />
              <Route path="faculty" element={<HODFaculty />} />
              <Route path="students" element={<HODStudents />} />
            </Route>

            {/* Faculty routes */}
            <Route path="/faculty" element={<ProtectedRoute role="faculty"><FacultyLayout /></ProtectedRoute>}>
              <Route index element={<FacultyDashboard />} />
              <Route path="events" element={<FacultyEvents />} />
              <Route path="calendar" element={<FacultyCalendar />} />
              <Route path="students" element={<FacultyStudents />} />
            </Route>

            {/* Student routes */}
            <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="calendar" element={<StudentCalendar />} />
              <Route path="notifications" element={<StudentNotifications />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
