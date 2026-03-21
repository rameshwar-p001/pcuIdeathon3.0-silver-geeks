import { useEffect, useState } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import FacultyDashboard from './components/FacultyDashboard'
import LoginForm from './components/LoginForm'
import StudentDashboard from './components/StudentDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import { auth, createAuthUserFromAdminSession, db } from './lib/firebase'
import './App.css'

const ADMIN_EMAIL = 'admin@rdp.com'
const ADMIN_PASSWORD = '123456'

function toCampusEmail(input) {
  const normalized = input.trim().toLowerCase()
  return normalized.includes('@') ? normalized : `${normalized}@campus.local`
}

function isValidCampusIdentifier(input) {
  // Allowed chars keep generated email local-part valid.
  return /^[a-z0-9._%+-]+$/i.test(input)
}

function getFriendlyAuthError(error) {
  if (!error?.code) {
    return 'Something went wrong. Please try again.'
  }

  if (error.code === 'auth/email-already-in-use') {
    return 'This user ID already exists.'
  }

  if (error.code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.'
  }

  if (error.code === 'auth/invalid-credential') {
    return 'Invalid credentials. Please check Email/ID and password.'
  }

  if (error.code === 'auth/invalid-email') {
    return 'Invalid ID/email format. Use only letters, numbers, ., _, %, + or -.'
  }

  if (error.code === 'auth/operation-not-allowed') {
    return 'Email/password sign-in is disabled in Firebase Authentication.'
  }

  if (error.code === 'auth/network-request-failed') {
    return 'Network error. Check your internet connection and retry.'
  }

  return error.message || 'Authentication failed.'
}

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
      try {
        const parsed = JSON.parse(savedSession)
        const validRoles = ['admin', 'student', 'faculty']

        if (!validRoles.includes(parsed?.role) || !parsed?.user) {
          localStorage.removeItem('campusSession')
          return
        }

        setIsAuthenticated(true)
        setLoggedInRole(parsed.role)
        setLoggedInUser(parsed.user)
        setSuccessMessage(`Welcome back, ${parsed.user.name || 'User'}.`)
      } catch {
        localStorage.removeItem('campusSession')
      }
    }
  }, [])

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAuthenticated || loggedInRole !== 'admin') {
        return
      }

      try {
        const snapshot = await getDocs(collection(db, 'users'))
        const nextStudents = []
        const nextFaculties = []

        snapshot.forEach((item) => {
          const user = item.data()

          if (user.role === 'student') {
            nextStudents.push(user)
          }

          if (user.role === 'faculty') {
            nextFaculties.push(user)
          }
        })

        setStudents(nextStudents)
        setFaculties(nextFaculties)
      } catch {
        setErrorMessage('Unable to load users from Firestore.')
      }
    }

    loadUsers()
  }, [isAuthenticated, loggedInRole])

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

  const handleLogin = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const credential = email.trim().toLowerCase()

    if (!credential || !password) {
      setErrorMessage('Email or ID and password are required.')
      return
    }

    if (credential === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      await signOut(auth).catch(() => {})

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

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      )

      const loginEmail = toCampusEmail(credential)
      const credentials = await signInWithEmailAndPassword(auth, loginEmail, password)
      const userRef = doc(db, 'users', credentials.user.uid)
      const snapshot = await getDoc(userRef)

      if (!snapshot.exists()) {
        await signOut(auth)
        setErrorMessage('Account profile missing. Contact admin.')
        return
      }

      const profile = snapshot.data()
      const role = profile.role

      if (role !== 'student' && role !== 'faculty') {
        await signOut(auth)
        setErrorMessage('Invalid account role. Contact admin.')
        return
      }

      const user = {
        uid: credentials.user.uid,
        id: profile.id,
        name: profile.name,
        email: profile.email,
      }

      setLoggedInRole(role)
      setLoggedInUser(user)
      setIsAuthenticated(true)

      if (rememberMe) {
        localStorage.setItem('campusSession', JSON.stringify({ role, user }))
      } else {
        localStorage.removeItem('campusSession')
      }

      setSuccessMessage('Login successful.')
      setPassword('')
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
    }
  }

  const handleLogout = async () => {
    localStorage.removeItem('campusSession')

    if (loggedInRole !== 'admin') {
      await signOut(auth).catch(() => {})
    }

    setIsAuthenticated(false)
    setLoggedInRole('')
    setLoggedInUser(null)
    setPassword('')
    setEmail('')
    setRememberMe(false)
    setSuccessMessage('Logged out successfully.')
    setErrorMessage('')
  }

  const handleCreateStudent = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextName = studentName.trim()
    const nextId = studentId.trim().toLowerCase()
    const nextPassword = studentPassword.trim()

    if (!nextName || !nextId || !nextPassword) {
      setErrorMessage('Student name, ID and password are required.')
      return
    }

    if (!isValidCampusIdentifier(nextId)) {
      setErrorMessage('Invalid student ID format. Avoid spaces and special symbols.')
      return
    }

    if (
      students.some((student) => student.id === nextId) ||
      faculties.some((faculty) => faculty.id === nextId)
    ) {
      setErrorMessage('This ID already exists.')
      return
    }

    try {
      const emailAddress = toCampusEmail(nextId)
      const profile = {
        role: 'student',
        name: nextName,
        id: nextId,
        email: emailAddress,
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(
        emailAddress,
        nextPassword,
        profile,
      )

      setStudents((prev) => [{ ...profile, uid: createdUser.uid }, ...prev])
      setSuccessMessage(`Student ${nextName} created.`)
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
      return
    }

    setErrorMessage('')
    setStudentName('')
    setStudentId('')
    setStudentPassword('')
  }

  const handleAddFaculty = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextName = facultyName.trim()
    const nextId = facultyId.trim().toLowerCase()
    const nextPassword = facultyPassword.trim()

    if (!nextName || !nextId || !nextPassword) {
      setErrorMessage('Faculty name, ID and password are required.')
      return
    }

    if (!isValidCampusIdentifier(nextId)) {
      setErrorMessage('Invalid faculty ID format. Avoid spaces and special symbols.')
      return
    }

    if (
      faculties.some((faculty) => faculty.id === nextId) ||
      students.some((student) => student.id === nextId)
    ) {
      setErrorMessage('This ID already exists.')
      return
    }

    try {
      const emailAddress = toCampusEmail(nextId)
      const profile = {
        role: 'faculty',
        name: nextName,
        id: nextId,
        email: emailAddress,
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(
        emailAddress,
        nextPassword,
        profile,
      )

      setFaculties((prev) => [{ ...profile, uid: createdUser.uid }, ...prev])
      setSuccessMessage(`Faculty ${nextName} added.`)
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
      return
    }

    setErrorMessage('')
    setFacultyName('')
    setFacultyId('')
    setFacultyPassword('')
  }

  const handleDeleteUser = async (role, id) => {
    const source = role === 'Student' ? students : faculties
    const user = source.find((item) => item.id === id)

    if (!user?.uid) {
      setErrorMessage('Unable to identify user for deletion.')
      return
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid))
    } catch {
      setErrorMessage('Unable to delete user from Firestore.')
      return
    }

    if (role === 'Student') {
      setStudents((prev) => prev.filter((student) => student.id !== id))
    } else {
      setFaculties((prev) => prev.filter((faculty) => faculty.id !== id))
    }

    setSuccessMessage(`${role} user deleted.`)
  }

  const handleEditUser = async (role, id) => {
    if (role === 'Student') {
      const target = students.find((student) => student.id === id)
      if (!target) {
        return
      }

      const updatedName = window.prompt('Update name', target.name)
      if (!updatedName) {
        return
      }

      const nextName = updatedName.trim()
      if (!nextName) {
        return
      }

      try {
        await updateDoc(doc(db, 'users', target.uid), { name: nextName })
      } catch {
        setErrorMessage('Unable to update student in Firestore.')
        return
      }

      setStudents((prev) =>
        prev.map((student) =>
          student.id === id ? { ...student, name: nextName } : student,
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
    if (!updatedName) {
      return
    }

    const nextName = updatedName.trim()
    if (!nextName) {
      return
    }

    try {
      await updateDoc(doc(db, 'users', target.uid), { name: nextName })
    } catch {
      setErrorMessage('Unable to update faculty in Firestore.')
      return
    }

    setFaculties((prev) =>
      prev.map((faculty) =>
        faculty.id === id ? { ...faculty, name: nextName } : faculty,
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
