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
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import FacultyDashboard from './components/FacultyDashboard'
import LoginForm from './components/LoginForm'
import StudentDashboard from './components/StudentDashboard'
import CampusInchargeDashboard from './components/CampusInchargeDashboard'
import PlacementCellDashboard from './components/PlacementCellDashboard'
import ExamCoordinatorDashboard from './components/ExamCoordinatorDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import { auth, createAuthUserFromAdminSession, db } from './lib/firebase'
import { apiRequest } from './lib/api'
import './App.css'

const ADMIN_EMAIL = 'admin@rdp.com'
const ADMIN_PASSWORD = '123456'
const SESSION_KEY = 'campusSession'
const CLASS_OPTIONS = [
  { id: 'cse-a', label: 'CSE-A' },
  { id: 'cse-b', label: 'CSE-B' },
  { id: 'it-a', label: 'IT-A' },
  { id: 'it-b', label: 'IT-B' },
]

function normalizeClassId(value) {
  return String(value || '').trim().toLowerCase()
}

function getClassLabelFromId(classId) {
  const normalized = normalizeClassId(classId)
  const option = CLASS_OPTIONS.find((item) => normalizeClassId(item.id) === normalized)
  return option?.label || normalized.toUpperCase()
}

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
  const [studentEmail, setStudentEmail] = useState('')
  const [studentEnrollmentNumber, setStudentEnrollmentNumber] = useState('')
  const [studentClassId, setStudentClassId] = useState('')
  const [studentDepartment, setStudentDepartment] = useState('')
  const [studentSemester, setStudentSemester] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [facultyName, setFacultyName] = useState('')
  const [facultyEmail, setFacultyEmail] = useState('')
  const [facultyMemberId, setFacultyMemberId] = useState('')
  const [facultyDepartment, setFacultyDepartment] = useState('')
  const [facultySubject, setFacultySubject] = useState('')
  const [facultyPhone, setFacultyPhone] = useState('')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [inchargeName, setInchargeName] = useState('')
  const [inchargeEmail, setInchargeEmail] = useState('')
  const [inchargeId, setInchargeId] = useState('')
  const [inchargeDepartment, setInchargeDepartment] = useState('')
  const [inchargePhone, setInchargePhone] = useState('')
  const [inchargePassword, setInchargePassword] = useState('')
  const [placementName, setPlacementName] = useState('')
  const [placementEmail, setPlacementEmail] = useState('')
  const [placementId, setPlacementId] = useState('')
  const [placementDepartment, setPlacementDepartment] = useState('')
  const [placementPhone, setPlacementPhone] = useState('')
  const [placementPassword, setPlacementPassword] = useState('')
  const [examCoordinatorName, setExamCoordinatorName] = useState('')
  const [examCoordinatorEmail, setExamCoordinatorEmail] = useState('')
  const [examCoordinatorId, setExamCoordinatorId] = useState('')
  const [examCoordinatorDepartment, setExamCoordinatorDepartment] = useState('')
  const [examCoordinatorPhone, setExamCoordinatorPhone] = useState('')
  const [examCoordinatorPassword, setExamCoordinatorPassword] = useState('')
  const [students, setStudents] = useState([])
  const [faculties, setFaculties] = useState([])
  const [campusIncharges, setCampusIncharges] = useState([])
  const [placementCells, setPlacementCells] = useState([])
  const [examCoordinators, setExamCoordinators] = useState([])
  const [profileChangeRequests, setProfileChangeRequests] = useState([])
  const [classTeacherAssignments, setClassTeacherAssignments] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedFacultyUid, setSelectedFacultyUid] = useState('')

  const persistSession = (role, user, shouldRemember) => {
    const payload = JSON.stringify({ role, user })

    if (shouldRemember) {
      localStorage.setItem(SESSION_KEY, payload)
      sessionStorage.removeItem(SESSION_KEY)
      return
    }

    sessionStorage.setItem(SESSION_KEY, payload)
    localStorage.removeItem(SESSION_KEY)
  }

  useEffect(() => {
    const savedSession =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        const validRoles = ['admin', 'student', 'faculty', 'campusIncharge', 'placementCell', 'coordinator', 'examCoordinator']

        if (!validRoles.includes(parsed?.role) || !parsed?.user) {
          localStorage.removeItem(SESSION_KEY)
          sessionStorage.removeItem(SESSION_KEY)
          return
        }

        setIsAuthenticated(true)
        setLoggedInRole(parsed.role)
        setLoggedInUser(parsed.user)
        setSuccessMessage(`Welcome back, ${parsed.user.name || 'User'}.`)
      } catch {
        localStorage.removeItem(SESSION_KEY)
        sessionStorage.removeItem(SESSION_KEY)
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
        const nextIncharges = []
        const nextPlacementCells = []
        const nextExamCoordinators = []

        snapshot.forEach((item) => {
          const user = item.data()

          if (user.role === 'student') {
            nextStudents.push(user)
          }

          if (user.role === 'faculty') {
            nextFaculties.push(user)
          }

          if (user.role === 'campusIncharge') {
            nextIncharges.push(user)
          }

          if (user.role === 'placementCell') {
            nextPlacementCells.push(user)
          }

          if (user.role === 'examCoordinator') {
            nextExamCoordinators.push(user)
          }
        })

        setStudents(nextStudents)
        setFaculties(nextFaculties)
        setCampusIncharges(nextIncharges)
        setPlacementCells(nextPlacementCells)
        setExamCoordinators(nextExamCoordinators)
      } catch {
        setErrorMessage('Unable to load users from Firestore.')
      }
    }

    loadUsers()
  }, [isAuthenticated, loggedInRole])

  useEffect(() => {
    const loadClassTeacherAssignments = async () => {
      if (!isAuthenticated || loggedInRole !== 'admin') {
        setClassTeacherAssignments([])
        return
      }

      try {
        if (auth.currentUser) {
          const response = await apiRequest('/api/admin/assigned-classes')
          const rows = (response.data || []).map((item) => ({
            classId: normalizeClassId(item.class_id || item.classId || item.id),
            className: getClassLabelFromId(item.class_id || item.classId || item.id),
            facultyUid: item.faculty_id || item.facultyUid || '',
            facultyName: item.faculty_name || item.facultyName || '',
            facultyEmail: item.faculty_email || item.facultyEmail || '',
            updatedAt: item.updatedAt || '',
          }))

          setClassTeacherAssignments(rows)
          return
        }

        const snapshot = await getDocs(collection(db, 'classTeachers'))
        const fallbackRows = []

        snapshot.forEach((item) => {
          const data = item.data()
          fallbackRows.push({
            ...data,
            classId: normalizeClassId(data.classId || data.class_id || item.id),
            class_id: normalizeClassId(data.classId || data.class_id || item.id),
            className: data.className || data.class_name || getClassLabelFromId(data.classId || data.class_id || item.id),
            class_name: data.class_name || data.className || getClassLabelFromId(data.classId || data.class_id || item.id),
          })
        })

        setClassTeacherAssignments(fallbackRows)
      } catch {
        setErrorMessage('Unable to load class teacher assignments.')
      }
    }

    loadClassTeacherAssignments()
  }, [isAuthenticated, loggedInRole])

  useEffect(() => {
    if (!isAuthenticated || loggedInRole !== 'admin') {
      setProfileChangeRequests([])
      return undefined
    }

    const requestsQuery = query(collection(db, 'profileChangeRequests'))

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const rows = []

        snapshot.forEach((item) => {
          rows.push({
            id: item.id,
            ...item.data(),
          })
        })

        rows.sort((a, b) => {
          const aTime = Date.parse(a.createdAt || '') || 0
          const bTime = Date.parse(b.createdAt || '') || 0

          if (a.status === 'pending' && b.status !== 'pending') {
            return -1
          }

          if (a.status !== 'pending' && b.status === 'pending') {
            return 1
          }

          return bTime - aTime
        })

        setProfileChangeRequests(rows)
      },
      () => {
        setErrorMessage('Unable to load profile change requests.')
      },
    )

    return () => unsubscribe()
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

      persistSession('admin', user, rememberMe)

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

      if (role !== 'student' && role !== 'faculty' && role !== 'campusIncharge' && role !== 'placementCell' && role !== 'coordinator' && role !== 'examCoordinator') {
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

      persistSession(role, user, rememberMe)

      setSuccessMessage('Login successful.')
      setPassword('')
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
    }
  }

  const handleLogout = async () => {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)

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
    const nextEmail = studentEmail.trim().toLowerCase()
    const nextEnrollmentNumber = studentEnrollmentNumber.trim().toLowerCase()
    const nextClassId = normalizeClassId(studentClassId)
    const nextDepartment = studentDepartment.trim()
    const nextSemester = studentSemester.trim()
    const nextPhone = studentPhone.trim()
    const nextPassword = studentPassword.trim()
    const semesterNumber = Number.parseInt(nextSemester, 10)

    if (
      !nextName ||
      !nextEmail ||
      !nextEnrollmentNumber ||
      !nextClassId ||
      !nextDepartment ||
      !nextSemester ||
      !nextPassword
    ) {
      setErrorMessage(
        'Student name, email, enrollment number, class, department, semester and password are required.',
      )
      return
    }

    const selectedClass = CLASS_OPTIONS.find((item) => normalizeClassId(item.id) === nextClassId)
    if (!selectedClass) {
      setErrorMessage('Please choose a valid class for the student.')
      return
    }

    if (!Number.isInteger(semesterNumber) || semesterNumber <= 0) {
      setErrorMessage('Semester must be a valid positive number.')
      return
    }

    if (
      students.some(
        (student) =>
          student.enrollmentNumber === nextEnrollmentNumber ||
          student.email?.toLowerCase() === nextEmail,
      ) ||
      faculties.some((faculty) => faculty.email?.toLowerCase() === nextEmail) ||
      campusIncharges.some((incharge) => incharge.email?.toLowerCase() === nextEmail) ||
      placementCells.some((placementCell) => placementCell.email?.toLowerCase() === nextEmail)
    ) {
      setErrorMessage('Student email or enrollment number already exists.')
      return
    }

    try {
      const profile = {
        role: 'student',
        name: nextName,
        id: nextEnrollmentNumber,
        email: nextEmail,
        enrollmentNumber: nextEnrollmentNumber,
        class_id: selectedClass.id,
        classId: selectedClass.id,
        class_name: selectedClass.label,
        className: selectedClass.label,
        department: nextDepartment,
        semester: semesterNumber,
        phone: nextPhone,
        pendingAssignmentsCount: 0,
        feeStatus: 'Pending',
        selfieUrl: '',
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(
        nextEmail,
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
    setStudentEmail('')
    setStudentEnrollmentNumber('')
    setStudentClassId('')
    setStudentDepartment('')
    setStudentSemester('')
    setStudentPhone('')
    setStudentPassword('')
  }

  const handleAddFaculty = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextName = facultyName.trim()
    const nextEmail = facultyEmail.trim().toLowerCase()
    const nextFacultyId = facultyMemberId.trim().toLowerCase()
    const nextDepartment = facultyDepartment.trim()
    const nextSubject = facultySubject.trim()
    const nextPhone = facultyPhone.trim()
    const nextPassword = facultyPassword.trim()

    if (!nextName || !nextEmail || !nextFacultyId || !nextDepartment || !nextPassword) {
      setErrorMessage(
        'Faculty name, email, faculty ID, department and password are required.',
      )
      return
    }

    if (!isValidCampusIdentifier(nextFacultyId)) {
      setErrorMessage('Invalid faculty ID format. Avoid spaces and special symbols.')
      return
    }

    if (
      faculties.some(
        (faculty) =>
          faculty.facultyId === nextFacultyId ||
          faculty.email?.toLowerCase() === nextEmail,
      ) ||
      students.some((student) => student.email?.toLowerCase() === nextEmail) ||
      campusIncharges.some((incharge) => incharge.email?.toLowerCase() === nextEmail) ||
      placementCells.some((placementCell) => placementCell.email?.toLowerCase() === nextEmail) ||
      examCoordinators.some((coordinator) => coordinator.email?.toLowerCase() === nextEmail)
    ) {
      setErrorMessage('Faculty email or faculty ID already exists.')
      return
    }

    try {
      const profile = {
        role: 'faculty',
        name: nextName,
        id: nextFacultyId,
        email: nextEmail,
        facultyId: nextFacultyId,
        department: nextDepartment,
        subject: nextSubject,
        phone: nextPhone,
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(
        nextEmail,
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
    setFacultyEmail('')
    setFacultyMemberId('')
    setFacultyDepartment('')
    setFacultySubject('')
    setFacultyPhone('')
    setFacultyPassword('')
  }

  const handleAddCampusIncharge = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextName = inchargeName.trim()
    const nextEmail = inchargeEmail.trim().toLowerCase()
    const nextInchargeId = inchargeId.trim().toLowerCase()
    const nextDepartment = inchargeDepartment.trim()
    const nextPhone = inchargePhone.trim()
    const nextPassword = inchargePassword.trim()

    if (!nextName || !nextEmail || !nextInchargeId || !nextDepartment || !nextPassword) {
      setErrorMessage('Incharge name, email, incharge ID, department and password are required.')
      return
    }

    if (!isValidCampusIdentifier(nextInchargeId)) {
      setErrorMessage('Invalid campus incharge ID format. Avoid spaces and special symbols.')
      return
    }

    if (
      campusIncharges.some(
        (item) => item.inchargeId === nextInchargeId || item.email?.toLowerCase() === nextEmail,
      ) ||
      faculties.some((faculty) => faculty.email?.toLowerCase() === nextEmail) ||
      students.some((student) => student.email?.toLowerCase() === nextEmail) ||
      placementCells.some((placementCell) => placementCell.email?.toLowerCase() === nextEmail) ||
      examCoordinators.some((coordinator) => coordinator.email?.toLowerCase() === nextEmail)
    ) {
      setErrorMessage('Campus incharge email or incharge ID already exists.')
      return
    }

    try {
      const profile = {
        role: 'campusIncharge',
        name: nextName,
        id: nextInchargeId,
        inchargeId: nextInchargeId,
        email: nextEmail,
        department: nextDepartment,
        phone: nextPhone,
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(
        nextEmail,
        nextPassword,
        profile,
      )

      setCampusIncharges((prev) => [{ ...profile, uid: createdUser.uid }, ...prev])
      setSuccessMessage(`Campus incharge ${nextName} added.`)
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
      return
    }

    setInchargeName('')
    setInchargeEmail('')
    setInchargeId('')
    setInchargeDepartment('')
    setInchargePhone('')
    setInchargePassword('')
  }

  const handleAddPlacementCell = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextName = placementName.trim()
    const nextEmail = placementEmail.trim().toLowerCase()
    const nextPlacementId = placementId.trim().toLowerCase()
    const nextDepartment = placementDepartment.trim()
    const nextPhone = placementPhone.trim()
    const nextPassword = placementPassword.trim()

    if (!nextName || !nextEmail || !nextPlacementId || !nextDepartment || !nextPassword) {
      setErrorMessage('Placement cell name, email, placement ID, department and password are required.')
      return
    }

    if (!isValidCampusIdentifier(nextPlacementId)) {
      setErrorMessage('Invalid placement cell ID format. Avoid spaces and special symbols.')
      return
    }

    if (
      placementCells.some(
        (item) => item.placementId === nextPlacementId || item.email?.toLowerCase() === nextEmail,
      ) ||
      faculties.some((faculty) => faculty.email?.toLowerCase() === nextEmail) ||
      students.some((student) => student.email?.toLowerCase() === nextEmail) ||
      campusIncharges.some((item) => item.email?.toLowerCase() === nextEmail) ||
      examCoordinators.some((coordinator) => coordinator.email?.toLowerCase() === nextEmail)
    ) {
      setErrorMessage('Placement cell email or placement ID already exists.')
      return
    }

    try {
      const profile = {
        role: 'placementCell',
        name: nextName,
        id: nextPlacementId,
        placementId: nextPlacementId,
        email: nextEmail,
        department: nextDepartment,
        phone: nextPhone,
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(nextEmail, nextPassword, profile)
      setPlacementCells((prev) => [{ ...profile, uid: createdUser.uid }, ...prev])
      setSuccessMessage(`Placement cell ${nextName} added.`)
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
      return
    }

    setPlacementName('')
    setPlacementEmail('')
    setPlacementId('')
    setPlacementDepartment('')
    setPlacementPhone('')
    setPlacementPassword('')
  }

  const handleAddExamCoordinator = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextName = examCoordinatorName.trim()
    const nextEmail = examCoordinatorEmail.trim().toLowerCase()
    const nextCoordinatorId = examCoordinatorId.trim().toLowerCase()
    const nextDepartment = examCoordinatorDepartment.trim()
    const nextPhone = examCoordinatorPhone.trim()
    const nextPassword = examCoordinatorPassword.trim()

    if (!nextName || !nextEmail || !nextCoordinatorId || !nextDepartment || !nextPassword) {
      setErrorMessage('Exam coordinator name, email, coordinator ID, department and password are required.')
      return
    }

    if (!isValidCampusIdentifier(nextCoordinatorId)) {
      setErrorMessage('Invalid exam coordinator ID format. Avoid spaces and special symbols.')
      return
    }

    if (
      examCoordinators.some(
        (item) => item.examCoordinatorId === nextCoordinatorId || item.email?.toLowerCase() === nextEmail,
      ) ||
      faculties.some((faculty) => faculty.email?.toLowerCase() === nextEmail) ||
      students.some((student) => student.email?.toLowerCase() === nextEmail) ||
      campusIncharges.some((item) => item.email?.toLowerCase() === nextEmail) ||
      placementCells.some((item) => item.email?.toLowerCase() === nextEmail)
    ) {
      setErrorMessage('Exam coordinator email or coordinator ID already exists.')
      return
    }

    try {
      const profile = {
        role: 'examCoordinator',
        name: nextName,
        id: nextCoordinatorId,
        examCoordinatorId: nextCoordinatorId,
        email: nextEmail,
        department: nextDepartment,
        phone: nextPhone,
        createdAt: new Date().toISOString(),
      }

      const createdUser = await createAuthUserFromAdminSession(nextEmail, nextPassword, profile)
      setExamCoordinators((prev) => [{ ...profile, uid: createdUser.uid }, ...prev])
      setSuccessMessage(`Exam coordinator ${nextName} added.`)
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
      return
    }

    setExamCoordinatorName('')
    setExamCoordinatorEmail('')
    setExamCoordinatorId('')
    setExamCoordinatorDepartment('')
    setExamCoordinatorPhone('')
    setExamCoordinatorPassword('')
  }

  const handleDeleteUser = async (role, id) => {
    const source = role === 'Student'
      ? students
      : role === 'Faculty'
        ? faculties
        : role === 'Campus Incharge'
          ? campusIncharges
            : role === 'Placement Cell'
              ? placementCells
              : examCoordinators
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
    } else if (role === 'Faculty') {
      setFaculties((prev) => prev.filter((faculty) => faculty.id !== id))
    } else if (role === 'Campus Incharge') {
      setCampusIncharges((prev) => prev.filter((incharge) => incharge.id !== id))
    } else if (role === 'Placement Cell') {
      setPlacementCells((prev) => prev.filter((placementCell) => placementCell.id !== id))
    } else {
      setExamCoordinators((prev) => prev.filter((coordinator) => coordinator.id !== id))
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

    if (role === 'Campus Incharge') {
      const targetIncharge = campusIncharges.find((incharge) => incharge.id === id)
      if (!targetIncharge) {
        return
      }

      const updatedName = window.prompt('Update name', targetIncharge.name)
      if (!updatedName) {
        return
      }

      const nextName = updatedName.trim()
      if (!nextName) {
        return
      }

      try {
        await updateDoc(doc(db, 'users', targetIncharge.uid), { name: nextName })
      } catch {
        setErrorMessage('Unable to update campus incharge in Firestore.')
        return
      }

      setCampusIncharges((prev) =>
        prev.map((incharge) =>
          incharge.id === id ? { ...incharge, name: nextName } : incharge,
        ),
      )
      setSuccessMessage('Campus incharge updated.')
      return
    }

    if (role === 'Placement Cell') {
      const targetPlacementCell = placementCells.find((placementCell) => placementCell.id === id)
      if (!targetPlacementCell) {
        return
      }

      const updatedName = window.prompt('Update name', targetPlacementCell.name)
      if (!updatedName) {
        return
      }

      const nextName = updatedName.trim()
      if (!nextName) {
        return
      }

      try {
        await updateDoc(doc(db, 'users', targetPlacementCell.uid), { name: nextName })
      } catch {
        setErrorMessage('Unable to update placement cell user in Firestore.')
        return
      }

      setPlacementCells((prev) =>
        prev.map((placementCell) =>
          placementCell.id === id ? { ...placementCell, name: nextName } : placementCell,
        ),
      )
      setSuccessMessage('Placement cell user updated.')
      return
    }

    if (role === 'Exam Coordinator') {
      const targetExamCoordinator = examCoordinators.find((coordinator) => coordinator.id === id)
      if (!targetExamCoordinator) {
        return
      }

      const updatedName = window.prompt('Update name', targetExamCoordinator.name)
      if (!updatedName) {
        return
      }

      const nextName = updatedName.trim()
      if (!nextName) {
        return
      }

      try {
        await updateDoc(doc(db, 'users', targetExamCoordinator.uid), { name: nextName })
      } catch {
        setErrorMessage('Unable to update exam coordinator user in Firestore.')
        return
      }

      setExamCoordinators((prev) =>
        prev.map((coordinator) =>
          coordinator.id === id ? { ...coordinator, name: nextName } : coordinator,
        ),
      )
      setSuccessMessage('Exam coordinator user updated.')
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

  const handleApproveProfileChangeRequest = async (requestId) => {
    const request = profileChangeRequests.find((item) => item.id === requestId)

    if (!request || request.status !== 'pending') {
      return
    }

    const allowedKeys = ['name', 'department', 'semester', 'phone']
    const rawChanges = request.requestedChanges || {}
    const approvedChanges = {}

    allowedKeys.forEach((key) => {
      if (rawChanges[key] !== undefined) {
        approvedChanges[key] = rawChanges[key]
      }
    })

    if (Object.keys(approvedChanges).length > 0) {
      try {
        await updateDoc(doc(db, 'users', request.studentUid), approvedChanges)
      } catch {
        setErrorMessage('Unable to apply approved changes to student profile.')
        return
      }
    }

    try {
      await updateDoc(doc(db, 'profileChangeRequests', requestId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: loggedInUser?.id || 'admin',
      })
    } catch {
      setErrorMessage('Unable to mark request as approved.')
      return
    }

    if (Object.keys(approvedChanges).length > 0) {
      setStudents((prev) =>
        prev.map((student) =>
          student.uid === request.studentUid ? { ...student, ...approvedChanges } : student,
        ),
      )
    }

    setSuccessMessage('Profile change request approved and saved.')
  }

  const handleRejectProfileChangeRequest = async (requestId) => {
    const request = profileChangeRequests.find((item) => item.id === requestId)

    if (!request || request.status !== 'pending') {
      return
    }

    const note = window.prompt('Optional rejection note', '')

    try {
      await updateDoc(doc(db, 'profileChangeRequests', requestId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: loggedInUser?.id || 'admin',
        rejectionNote: note?.trim() || '',
      })
      setSuccessMessage('Profile change request rejected.')
    } catch {
      setErrorMessage('Unable to reject profile change request.')
    }
  }

  const handleAssignClassTeacher = async (classId, facultyUid) => {
    setErrorMessage('')
    const normalizedClassId = normalizeClassId(classId)

    if (!normalizedClassId || !facultyUid) {
      setErrorMessage('Class and faculty are required for assignment.')
      return
    }

    const selectedClass = CLASS_OPTIONS.find((item) => normalizeClassId(item.id) === normalizedClassId)
    const selectedFaculty = faculties.find((faculty) => faculty.uid === facultyUid)

    if (!selectedClass || !selectedFaculty) {
      setErrorMessage('Invalid class or faculty selected.')
      return
    }

    const assignment = {
      classId: selectedClass.id,
      class_id: selectedClass.id,
      className: selectedClass.label,
      class_name: selectedClass.label,
      facultyUid: selectedFaculty.uid,
      facultyName: selectedFaculty.name,
      facultyEmail: selectedFaculty.email,
      updatedAt: new Date().toISOString(),
    }

    try {
      if (auth.currentUser) {
        await apiRequest('/api/admin/assign-class-teacher', {
          method: 'POST',
          body: JSON.stringify({
            class_id: normalizedClassId,
            faculty_id: facultyUid,
          }),
        })
      } else {
        // Keep local-admin mode functional when no Firebase-authenticated admin user exists.
        await setDoc(doc(db, 'classTeachers', normalizedClassId), assignment)
      }

      setClassTeacherAssignments((prev) => {
        const existingIndex = prev.findIndex(
          (item) => normalizeClassId(item.classId || item.class_id || item.id) === normalizedClassId,
        )

        if (existingIndex === -1) {
          return [assignment, ...prev]
        }

        const next = [...prev]
        next[existingIndex] = assignment
        return next
      })

      setSuccessMessage('Class teacher assigned successfully.')
    } catch {
      setErrorMessage('Unable to assign class teacher.')
    }
  }

  const handleAssignStudentDivision = async (studentId, classId) => {
    setErrorMessage('')
    const normalizedClassId = normalizeClassId(classId)

    if (!studentId || !normalizedClassId) {
      setErrorMessage('Student and class are required for division assignment.')
      return
    }

    const selectedStudent = students.find((student) => (student.uid || student.id) === studentId)
    const selectedClass = CLASS_OPTIONS.find((item) => normalizeClassId(item.id) === normalizedClassId)

    if (!selectedStudent || !selectedClass) {
      setErrorMessage('Invalid student or class selected.')
      return
    }

    try {
      const studentUid = selectedStudent.uid || selectedStudent.id
      await updateDoc(doc(db, 'users', studentUid), {
        classId: normalizedClassId,
        class_id: normalizedClassId,
        className: selectedClass.label,
        class_name: selectedClass.label,
      })

      setStudents((prev) =>
        prev.map((student) =>
          (student.uid || student.id) === studentId
            ? {
                ...student,
                classId: normalizedClassId,
                class_id: normalizedClassId,
                className: selectedClass.label,
                class_name: selectedClass.label,
              }
            : student
        )
      )

      setSuccessMessage(`${selectedStudent.name} assigned to ${selectedClass.label} successfully.`)
    } catch {
      setErrorMessage('Unable to assign student division.')
    }
  }

  const showForgotMessage = () => {
    setSuccessMessage('Please contact admin to reset your credentials.')
    setErrorMessage('')
  }

  return (
    <main className={`auth-page ${isAuthenticated ? 'authenticated' : ''}`}>
      {!isAuthenticated && (
        <section className="brand-panel" aria-label="Branding section">
          <p className="brand-kicker">Smart Campus <span className="erp-accent">ERP</span></p>
          <h1>Smart Campus <span className="erp-accent">ERP</span></h1>
          <p className="brand-copy">
            Securely access your classes, attendance, and student dashboard in one
            clean place.
          </p>
          <ul className="brand-points" aria-label="Platform key points">
            <li>Role-based secure access with trusted authentication.</li>
            <li>Real-time attendance, academic, and notice visibility.</li>
          </ul>
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
             errorMessage={errorMessage}
             onLogout={handleLogout}
             students={students}
             faculties={faculties}
             campusIncharges={campusIncharges}
             placementCells={placementCells}
             examCoordinators={examCoordinators}
             studentForm={{
               studentName,
               setStudentName,
               studentEmail,
               setStudentEmail,
               studentEnrollmentNumber,
               setStudentEnrollmentNumber,
               studentClassId,
               setStudentClassId,
               studentDepartment,
               setStudentDepartment,
               studentSemester,
               setStudentSemester,
               studentPhone,
               setStudentPhone,
               studentPassword,
               setStudentPassword,
             }}
             facultyForm={{
               facultyName,
               setFacultyName,
               facultyEmail,
               setFacultyEmail,
               facultyMemberId,
               setFacultyMemberId,
               facultyDepartment,
               setFacultyDepartment,
               facultySubject,
               setFacultySubject,
               facultyPhone,
               setFacultyPhone,
               facultyPassword,
               setFacultyPassword,
             }}
             campusInchargeForm={{
               inchargeName,
               setInchargeName,
               inchargeEmail,
               setInchargeEmail,
               inchargeId,
               setInchargeId,
               inchargeDepartment,
               setInchargeDepartment,
               inchargePhone,
               setInchargePhone,
               inchargePassword,
               setInchargePassword,
             }}
             placementCellForm={{
               placementName,
               setPlacementName,
               placementEmail,
               setPlacementEmail,
               placementId,
               setPlacementId,
               placementDepartment,
               setPlacementDepartment,
               placementPhone,
               setPlacementPhone,
               placementPassword,
               setPlacementPassword,
             }}
             examCoordinatorForm={{
               examCoordinatorName,
               setExamCoordinatorName,
               examCoordinatorEmail,
               setExamCoordinatorEmail,
               examCoordinatorId,
               setExamCoordinatorId,
               examCoordinatorDepartment,
               setExamCoordinatorDepartment,
               examCoordinatorPhone,
               setExamCoordinatorPhone,
               examCoordinatorPassword,
               setExamCoordinatorPassword,
             }}
             onCreateStudent={handleCreateStudent}
             onAddFaculty={handleAddFaculty}
             onAddCampusIncharge={handleAddCampusIncharge}
             onAddPlacementCell={handleAddPlacementCell}
             onAddExamCoordinator={handleAddExamCoordinator}
             onEditUser={handleEditUser}
             onDeleteUser={handleDeleteUser}
             profileChangeRequests={profileChangeRequests}
             onApproveProfileChangeRequest={handleApproveProfileChangeRequest}
             onRejectProfileChangeRequest={handleRejectProfileChangeRequest}
             classOptions={CLASS_OPTIONS}
             classTeacherAssignments={classTeacherAssignments}
             selectedClassId={selectedClassId}
             setSelectedClassId={setSelectedClassId}
             selectedFacultyUid={selectedFacultyUid}
             setSelectedFacultyUid={setSelectedFacultyUid}
             onAssignClassTeacher={handleAssignClassTeacher}
             onAssignStudentDivision={handleAssignStudentDivision}
           />
         )}
 
         {isAuthenticated && loggedInRole === 'student' && (
           <StudentDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
         {isAuthenticated && loggedInRole === 'faculty' && (
           <FacultyDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
         {isAuthenticated && loggedInRole === 'campusIncharge' && (
           <CampusInchargeDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
         {isAuthenticated && (loggedInRole === 'placementCell' || loggedInRole === 'coordinator') && (
           <PlacementCellDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
         {isAuthenticated && loggedInRole === 'examCoordinator' && (
           <ExamCoordinatorDashboard user={loggedInUser} onLogout={handleLogout} />
         )}
       </section>
     </main>
   )
 }
 
 export default App
