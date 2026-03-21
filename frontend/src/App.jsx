import { useEffect, useState } from 'react'
import FacultyDashboard from './components/FacultyDashboard'
import LoginForm from './components/LoginForm'
import StudentDashboard from './components/StudentDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import './App.css'

const ADMIN_EMAIL = 'admin@rdp.com'
const ADMIN_PASSWORD = '123456'

function App() {
  const [loggedInRole, setLoggedInRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeAdminPage, setActiveAdminPage] = useState('dashboard')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [facultyName, setFacultyName] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [students, setStudents] = useState([])
  const [faculties, setFaculties] = useState([])

  useEffect(() => {
    const savedSession = localStorage.getItem('campusSession')

    if (savedSession) {
      const parsed = JSON.parse(savedSession)
      setIsAuthenticated(true)
      setLoggedInRole(parsed.role)
      setLoggedInUser(parsed.user)
      setSuccessMessage(`Welcome back, ${parsed.user.name}.`)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.add('dashboard-mode')
    } else {
      document.body.classList.remove('dashboard-mode')
    }

    return () => {
      document.body.classList.remove('dashboard-mode')
    }
  }, [isAuthenticated])

  const handleLogin = (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const credential = email.trim()

    if (!credential || !password) {
      setErrorMessage('Email or ID and password are required.')
      return
    }

    if (credential === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const user = { name: 'Admin', id: ADMIN_EMAIL }
      setLoggedInRole('admin')
      setLoggedInUser(user)
      setIsAuthenticated(true)

      if (rememberMe) {
        localStorage.setItem('campusSession', JSON.stringify({ role: 'admin', user }))
      } else {
        localStorage.removeItem('campusSession')
      }

      setSuccessMessage('Login successful.')
      setPassword('')
      return
    }

    const matchedStudent = students.find(
      (user) => user.id === credential && user.password === password,
    )

    if (matchedStudent) {
      setLoggedInRole('student')
      setLoggedInUser(matchedStudent)
      setIsAuthenticated(true)

      if (rememberMe) {
        localStorage.setItem(
          'campusSession',
          JSON.stringify({ role: 'student', user: matchedStudent }),
        )
      } else {
        localStorage.removeItem('campusSession')
      }

      setSuccessMessage('Login successful.')
      setPassword('')
      return
    }

    const matchedFaculty = faculties.find(
      (user) => user.id === credential && user.password === password,
    )

    if (matchedFaculty) {
      setLoggedInRole('faculty')
      setLoggedInUser(matchedFaculty)
      setIsAuthenticated(true)

      if (rememberMe) {
        localStorage.setItem(
          'campusSession',
          JSON.stringify({ role: 'faculty', user: matchedFaculty }),
        )
      } else {
        localStorage.removeItem('campusSession')
      }

      setSuccessMessage('Login successful.')
      setPassword('')
      return
    }

    setErrorMessage('Invalid credentials. Please check Email/ID and password.')
  }

  const handleLogout = () => {
    localStorage.removeItem('campusSession')
    setIsAuthenticated(false)
    setLoggedInRole('')
    setLoggedInUser(null)
    setPassword('')
    setEmail('')
    setRememberMe(false)
    setSuccessMessage('Logged out successfully.')
    setErrorMessage('')
  }

  const handleCreateStudent = (event) => {
    event.preventDefault()
    setStudents((prev) => [
      {
        name: studentName.trim(),
        id: studentId.trim(),
        password: studentPassword,
      },
      ...prev,
    ])

    setSuccessMessage(`Student ${studentName.trim()} created.`)
    setErrorMessage('')
    setStudentName('')
    setStudentId('')
    setStudentPassword('')
  }

  const handleAddFaculty = (event) => {
    event.preventDefault()
    setFaculties((prev) => [
      {
        name: facultyName.trim(),
        id: facultyId.trim(),
        password: facultyPassword,
      },
      ...prev,
    ])

    setSuccessMessage(`Faculty ${facultyName.trim()} added.`)
    setErrorMessage('')
    setFacultyName('')
    setFacultyId('')
    setFacultyPassword('')
  }

  const handleDeleteUser = (role, id) => {
    if (role === 'Student') {
      setStudents((prev) => prev.filter((student) => student.id !== id))
    } else {
      setFaculties((prev) => prev.filter((faculty) => faculty.id !== id))
    }

    setSuccessMessage(`${role} user deleted.`)
  }

  const handleEditUser = (role, id) => {
    if (role === 'Student') {
      const target = students.find((student) => student.id === id)
      if (!target) {
        return
      }

      const updatedName = window.prompt('Update name', target.name)
      if (!updatedName) {
        return
      }

      setStudents((prev) =>
        prev.map((student) =>
          student.id === id ? { ...student, name: updatedName.trim() } : student,
        ),
      )
      setSuccessMessage('Student updated.')
      return
    }

    const target = faculties.find((faculty) => faculty.id === id)
     if (!target) {
       return
     }
 
     const updatedName = window.prompt('Update name', target.name)
     setFaculties((prev) =>
       prev.map((faculty) =>
         faculty.id === id ? { ...faculty, name: updatedName.trim() } : faculty,
       ),
     )
     setSuccessMessage('Faculty updated.')
   }
 
   const showForgotMessage = () => {
     setSuccessMessage('Please contact admin to reset your credentials.')
     setErrorMessage('')
   }
 
  return (
    <main className={`auth-page ${isAuthenticated ? 'authenticated' : ''}`}>
      {!isAuthenticated && (
        <section className="brand-panel" aria-label="Branding section">
          <h1>Campus Ai portal</h1>
          <p className="brand-copy">
            Securely access your classes, attendance, and student dashboard in one
            clean place.
          </p>
        </section>
      )}
 
       <section className="form-panel" aria-label="Authentication form">
         {!isAuthenticated && (
           <LoginForm
             email={email}
             setEmail={setEmail}
             password={password}
             setPassword={setPassword}
             rememberMe={rememberMe}
             setRememberMe={setRememberMe}
             showPassword={showPassword}
             setShowPassword={setShowPassword}
             errorMessage={errorMessage}
             successMessage={successMessage}
             onForgotPassword={showForgotMessage}
             onSubmit={handleLogin}
           />
         )}
 
         {isAuthenticated && loggedInRole === 'admin' && (
           <AdminDashboard
             activeAdminPage={activeAdminPage}
             setActiveAdminPage={setActiveAdminPage}
             adminName={loggedInUser?.name}
             successMessage={successMessage}
             onLogout={handleLogout}
             students={students}
             faculties={faculties}
             studentForm={{
               studentName,
               setStudentName,
               studentId,
               setStudentId,
               studentPassword,
               setStudentPassword,
             }}
             facultyForm={{
               facultyName,
               setFacultyName,
               facultyId,
               setFacultyId,
               facultyPassword,
               setFacultyPassword,
             }}
             onCreateStudent={handleCreateStudent}
             onAddFaculty={handleAddFaculty}
             onEditUser={handleEditUser}
             onDeleteUser={handleDeleteUser}
           />
         )}
 
         {isAuthenticated && loggedInRole === 'student' && (
           <StudentDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
         {isAuthenticated && loggedInRole === 'faculty' && (
           <FacultyDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
       </section>
     </main>
   )
 }
 
 export default App
