import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

import AttendanceQRScanner from './AttendanceQRScanner'
const ERP_MODULES = [
  { name: 'Academic', code: 'AC', type: 'academic', path: '/Academics' },
  { name: 'AI Based Doubt Section', code: 'AI', type: 'doubt', path: '/AIDoubtSection' },
  { name: 'Smart Placement Section', code: 'PL', type: 'placement', path: '/Placement' },
  { name: 'Campus Complain Section', code: 'CC', type: 'complaint', path: '/Complaint' },
  { name: 'Lost and Found Section', code: 'LF', type: 'lost-found', path: '/LostAndFound' },
  { name: 'Collaboration Board', code: 'CB', type: 'collaboration', path: '/Collaboration' },
  { name: 'Examination Section', code: 'EX', type: 'exam', path: '/Examination' },
  { name: 'Quiz Section', code: 'QZ', type: 'quiz', path: '/Quiz' },
  { name: 'Fees Section', code: 'FE', type: 'fees', path: '/Fees' },
]

function StudentDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [attendancePercentage, setAttendancePercentage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeView, setActiveView] = useState('summary')
  const [requestName, setRequestName] = useState('')
  const [requestDepartment, setRequestDepartment] = useState('')
  const [requestSemester, setRequestSemester] = useState('')
  const [requestPhone, setRequestPhone] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [activeRoutePath, setActiveRoutePath] = useState('')
  const [collabTitle, setCollabTitle] = useState('')
  const [collabType, setCollabType] = useState('Project')
  const [collabDescription, setCollabDescription] = useState('')
  const [collabPosts, setCollabPosts] = useState([])
  const [isLoadingCollabPosts, setIsLoadingCollabPosts] = useState(false)
  const [isSubmittingCollabPost, setIsSubmittingCollabPost] = useState(false)
  const [isProcessingCollabAction, setIsProcessingCollabAction] = useState(false)
  const [collabError, setCollabError] = useState('')
  const [collabMessage, setCollabMessage] = useState('')
  const [doubtQuestion, setDoubtQuestion] = useState('')
  const [doubtThread, setDoubtThread] = useState([
    {
      role: 'assistant',
      text: 'Ask your academic doubt here. You will get guided explanation and teacher follow-up.',
    },
  ])
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('')
  const [selfieError, setSelfieError] = useState('')
  const [selfieMessage, setSelfieMessage] = useState('')
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false)
  const [realtimeAttendanceRows, setRealtimeAttendanceRows] = useState([])
  const [realtimeTimetableRows, setRealtimeTimetableRows] = useState([])

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

  useEffect(() => {
    const loadStudentSummary = async () => {
      if (!user?.uid) {
        setIsLoading(false)
        setLoadError('Unable to identify student session.')
        return
      }

      setIsLoading(true)
      setLoadError('')

      try {
        const profileSnapshot = await getDoc(doc(db, 'users', user.uid))
        const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null

        if (!profileData) {
          setLoadError('Student profile not found.')
          setProfile(null)
          setAttendancePercentage(0)
          return
        }

        setProfile(profileData)
        setRequestName(profileData.name || '')
        setRequestDepartment(profileData.department || '')
        setRequestSemester(profileData.semester ? String(profileData.semester) : '')
        setRequestPhone(profileData.phone || '')

        setAttendancePercentage(0)
      } catch {
        setLoadError('Unable to load student dashboard details right now.')
      } finally {
        setIsLoading(false)
      }
    }

    loadStudentSummary()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setRealtimeAttendanceRows([])
      return () => {}
    }

    const attendanceByStudentQuery = query(collection(db, 'attendance'), where('student_id', '==', user.uid))
    const attendanceByLegacyUserIdQuery = query(collection(db, 'attendance'), where('userId', '==', user.uid))

    let rowsByStudent = []
    let rowsByLegacy = []

    const mergeAndSet = () => {
      const merged = [...rowsByStudent, ...rowsByLegacy]
      const unique = Array.from(new Map(merged.map((row) => [row.id, row])).values())
      setRealtimeAttendanceRows(unique)
    }

    const unsubscribeStudent = onSnapshot(attendanceByStudentQuery, (snapshot) => {
      rowsByStudent = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      mergeAndSet()
    })

    const unsubscribeLegacy = onSnapshot(attendanceByLegacyUserIdQuery, (snapshot) => {
      rowsByLegacy = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      mergeAndSet()
    })

    return () => {
      unsubscribeStudent()
      unsubscribeLegacy()
    }
  }, [user?.uid])

  useEffect(() => {
    if (!profile) {
      setRealtimeTimetableRows([])
      return () => {}
    }

    const classCandidates = Array.from(new Set([
      profile.class_id,
      profile.classId,
      profile.class_name,
      profile.className,
      profile.division,
      profile.div,
    ].filter(Boolean)))

    if (classCandidates.length === 0) {
      setRealtimeTimetableRows([])
      return () => {}
    }

    const unsubscribers = []
    const byClassMap = new Map()

    classCandidates.forEach((candidate) => {
      const timetableQuery = query(collection(db, 'timetable'), where('class_id', '==', candidate))
      const unsubscribe = onSnapshot(timetableQuery, (snapshot) => {
        byClassMap.set(
          candidate,
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        )
        const merged = Array.from(byClassMap.values()).flat()
        const unique = Array.from(new Map(merged.map((row) => [row.id, row])).values())
        setRealtimeTimetableRows(unique)
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [
    profile?.class_id,
    profile?.classId,
    profile?.class_name,
    profile?.className,
    profile?.division,
    profile?.div,
  ])

  useEffect(() => {
    return () => {
      if (selfiePreviewUrl) {
        URL.revokeObjectURL(selfiePreviewUrl)
      }
    }
  }, [selfiePreviewUrl])

  useEffect(() => {
    const syncRoute = () => {
      const currentPath = window.location.pathname
      const matchedModule = ERP_MODULES.find((module) =>
        module.path.toLowerCase() === currentPath.toLowerCase(),
      )
      setActiveRoutePath(matchedModule ? matchedModule.path : '')
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)

    return () => {
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  const studentName = profile?.name || user?.name || 'Student'
  const enrollmentNumber = profile?.enrollmentNumber || user?.id || 'N/A'
  const pendingAssignmentsCount = Number.isFinite(profile?.pendingAssignmentsCount)
    ? profile.pendingAssignmentsCount
    : 0
  const feeStatus = profile?.feeStatus === 'Paid' ? 'Paid' : 'Pending'
  const isDefaulter = attendancePercentage < 75
  const hasSelfie = Boolean(profile?.selfieUrl)

  const attendanceLabel = useMemo(() => {
    if (isLoading) {
      return 'Loading...'
    }

    return `${attendancePercentage}%`
  }, [attendancePercentage, isLoading])

  useEffect(() => {
    let presentCount = 0
    let totalCount = 0

    realtimeAttendanceRows.forEach((record) => {
      const status = String(record.status || '').toLowerCase()
      const isQrPresent = Boolean(record.qrVerified)

      if (status === 'present' || isQrPresent) {
        presentCount += 1
      }

      if (status === 'present' || status === 'absent' || status === 'leave' || isQrPresent) {
        totalCount += 1
      }
    })

    const calculatedPercentage = totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(2)) : 0
    setAttendancePercentage(calculatedPercentage)
  }, [realtimeAttendanceRows])

  const moduleCards = useMemo(() => ERP_MODULES, [])

  const activeModule = useMemo(
    () => moduleCards.find((module) => module.path === activeRoutePath) || null,
    [activeRoutePath, moduleCards],
  )

  const academicDetails = [
    { label: 'Student Name', value: studentName },
    { label: 'Enrollment No', value: enrollmentNumber },
    { label: 'Attendance', value: attendanceLabel },
    { label: 'Defaulter Status', value: isLoading ? 'Loading...' : isDefaulter ? 'Defaulter' : 'Good Standing' },
  ]

  const moduleContent = {
    'AI Based Doubt Section': 'Open AI doubt workspace for text/file-based doubt requests.',
    'Smart Placement Section': 'Open placement workspace for resume, drives, and shortlist flow.',
    'Campus Complain Section': 'Open complaint management module for tracking campus issues.',
    'Lost and Found Section': 'Open lost and found workflow for reporting and recovery updates.',
    'Collaboration Board': 'Open collaboration board to connect for projects and hackathons.',
    'Examination Section': 'Open examination module for schedules, hall tickets, and results.',
    'Quiz Section': 'Open quiz workspace for online tests, attempts, and scores.',
    'Fees Section': 'Open fees module for due amount, payment history, and receipts.',
  }

  const subjectAttendance = useMemo(() => {
    const grouped = new Map()

    realtimeAttendanceRows.forEach((record) => {
      const subject = record.subject || 'General'
      const status = String(record.status || '').toLowerCase()
      const isPresent = status === 'present' || Boolean(record.qrVerified)
      const isCounted = status === 'present' || status === 'absent' || status === 'leave' || Boolean(record.qrVerified)

      if (!isCounted) {
        return
      }

      const current = grouped.get(subject) || { present: 0, total: 0 }
      current.total += 1
      if (isPresent) {
        current.present += 1
      }
      grouped.set(subject, current)
    })

    return Array.from(grouped.entries()).map(([subject, counts]) => ({
      subject,
      percentage: `${counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0}%`,
    }))
  }, [realtimeAttendanceRows])

  const todaySchedule = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = dayNames[new Date().getDay()]
    const normalizeDay = (value) => String(value || '').trim().slice(0, 3).toLowerCase()

    return realtimeTimetableRows
      .filter((row) => normalizeDay(row.day) === today.toLowerCase())
      .map((row) => ({
        subject: row.subject || 'N/A',
        time: row.time_slot || 'N/A',
      }))
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
  }, [realtimeTimetableRows])

  const assignmentItems = [
    { title: 'DBMS Normalization Sheet', deadline: '25 Mar 2026' },
    { title: 'OS Process Scheduling Report', deadline: '27 Mar 2026' },
    { title: 'DSA Linked List Lab', deadline: '29 Mar 2026' },
  ]

  const internalMarks = [
    { subject: 'Mathematics', marks: '24/30' },
    { subject: 'Data Structures', marks: '22/30' },
    { subject: 'Operating Systems', marks: '20/30' },
  ]

  const totalFees = Number(profile?.totalFees) || 120000
  const paidAmount = Number(profile?.paidAmount) || 90000
  const penaltyAmount = Number(profile?.penaltyAmount) || 0
  const pendingAmount = Math.max(totalFees - paidAmount + penaltyAmount, 0)

  const complaintItems = [
    { title: 'Wi-Fi issue in Lab 3', status: 'Pending' },
    { title: 'Projector not working', status: 'In Progress' },
    { title: 'Library AC repair', status: 'Resolved' },
  ]

  const foundItems = ['Blue Water Bottle', 'Calculator', 'Notebook']
  const matchedItems = ['Student ID Card (Matched with your report)']

  const collaborationPosts = [
    { title: 'Smart Campus Hackathon Team', category: 'Hackathon' },
    { title: 'AI Attendance Research Group', category: 'Research' },
  ]

  const placementCompanies = [
    { name: 'Infosys', eligible: 'Eligible', applied: true },
    { name: 'TCS', eligible: 'Eligible', applied: false },
    { name: 'Capgemini', eligible: 'Not Eligible', applied: false },
  ]

  const handleModuleClick = (modulePath) => {
    if (window.location.pathname !== modulePath) {
      window.history.pushState({}, '', modulePath)
    }
    setActiveRoutePath(modulePath)
  }

  const goToDashboardRoute = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/')
    }
    setActiveRoutePath('')
  }

  const formatCollabDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return 'N/A'
    }
    return date.toLocaleString()
  }

  const getTypeBadgeClass = (type) => {
    const normalized = String(type || '').toLowerCase()
    if (normalized === 'project') return 'badge-project'
    if (normalized === 'hackathon') return 'badge-hackathon'
    if (normalized === 'research') return 'badge-research'
    if (normalized === 'book') return 'badge-book'
    return 'badge-project'
  }

  const fetchCollaborationPosts = async () => {
    setCollabError('')
    setIsLoadingCollabPosts(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/collaboration/posts`)
      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Collaboration API returned non-JSON. Check backend at ${apiBaseUrl}.`)
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to load collaboration posts')
      }

      setCollabPosts(Array.isArray(result.data) ? result.data : [])
    } catch (error) {
      setCollabError(error.message || 'Unable to load collaboration posts')
    } finally {
      setIsLoadingCollabPosts(false)
    }
  }

  useEffect(() => {
    if (activeModule?.type === 'collaboration') {
      fetchCollaborationPosts()
    }
  }, [activeModule?.type])

  const handleCreateCollaborationPost = async (event) => {
    event.preventDefault()
    setCollabError('')
    setCollabMessage('')

    const title = collabTitle.trim()
    const description = collabDescription.trim()

    if (!title || !collabType || !description) {
      setCollabError('Title, type, and description are required.')
      return
    }

    setIsSubmittingCollabPost(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/collaboration/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: collabType,
          description,
          studentName,
          studentUid: user?.uid || '',
        }),
      })

      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Collaboration API returned non-JSON. Check backend at ${apiBaseUrl}.`)
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to create collaboration post')
      }

      setCollabTitle('')
      setCollabType('Project')
      setCollabDescription('')
      setCollabMessage('Post created successfully.')
      await fetchCollaborationPosts()
    } catch (error) {
      setCollabError(error.message || 'Unable to create collaboration post')
    } finally {
      setIsSubmittingCollabPost(false)
    }
  }

  const handleRequestToJoinCollaborationPost = async (postId) => {
    setCollabError('')
    setCollabMessage('')
    setIsProcessingCollabAction(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/collaboration/posts/${postId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinerUid: user?.uid || '',
          joinerName: studentName,
          joinerEmail: profile?.email || user?.email || '',
          joinerMobile: profile?.phone || profile?.mobile || '',
        }),
      })

      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Collaboration API returned non-JSON. Check backend at ${apiBaseUrl}.`)
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to send join request')
      }

      setCollabMessage(result?.message || 'Join request sent successfully.')
      await fetchCollaborationPosts()
    } catch (error) {
      setCollabError(error.message || 'Unable to send join request')
    } finally {
      setIsProcessingCollabAction(false)
    }
  }

  const handleCancelJoinRequest = async (postId) => {
    setCollabError('')
    setCollabMessage('')
    setIsProcessingCollabAction(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/collaboration/posts/${postId}/request/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinerUid: user?.uid || '',
        }),
      })

      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Collaboration API returned non-JSON. Check backend at ${apiBaseUrl}.`)
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to cancel join request')
      }

      setCollabMessage(result?.message || 'Join request canceled successfully.')
      await fetchCollaborationPosts()
    } catch (error) {
      setCollabError(error.message || 'Unable to cancel join request')
    } finally {
      setIsProcessingCollabAction(false)
    }
  }

  const handleJoinRequestDecision = async (postId, joinerUid, action) => {
    setCollabError('')
    setCollabMessage('')
    setIsProcessingCollabAction(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/collaboration/posts/${postId}/request/${joinerUid}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUid: user?.uid || '',
          action,
        }),
      })

      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Collaboration API returned non-JSON. Check backend at ${apiBaseUrl}.`)
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Failed to ${action} join request`)
      }

      setCollabMessage(result?.message || `Join request ${action}ed.`)
      await fetchCollaborationPosts()
    } catch (error) {
      setCollabError(error.message || 'Unable to process join request')
    } finally {
      setIsProcessingCollabAction(false)
    }
  }

  const handleAskDoubt = (event) => {
    event.preventDefault()
    const question = doubtQuestion.trim()

    if (!question) {
      return
    }

    setDoubtThread((prev) => [
      ...prev,
      { role: 'student', text: question },
      {
        role: 'assistant',
        text: 'Doubt received. AI guidance is shown and subject teacher will review this thread.',
      },
    ])
    setDoubtQuestion('')
  }

  const handleProfileChangeRequest = async (event) => {
    event.preventDefault()
    setRequestError('')
    setRequestMessage('')

    if (!profile || !user?.uid) {
      setRequestError('Student profile is unavailable.')
      return
    }

    const nextName = requestName.trim()
    const nextDepartment = requestDepartment.trim()
    const nextSemester = requestSemester.trim()
    const nextPhone = requestPhone.trim()
    const nextNote = requestNote.trim()
    const parsedSemester = Number.parseInt(nextSemester, 10)

    if (nextSemester && (!Number.isInteger(parsedSemester) || parsedSemester <= 0)) {
      setRequestError('Suggested semester must be a valid positive number.')
      return
    }

    const requestedChanges = {}

    if (nextName !== (profile.name || '')) {
      requestedChanges.name = nextName
    }

    if (nextDepartment !== (profile.department || '')) {
      requestedChanges.department = nextDepartment
    }

    if (nextSemester && parsedSemester !== Number(profile.semester || 0)) {
      requestedChanges.semester = parsedSemester
    }

    if (nextPhone !== (profile.phone || '')) {
      requestedChanges.phone = nextPhone
    }

    if (Object.keys(requestedChanges).length === 0 && !nextNote) {
      setRequestError('No changes detected. Update at least one field or add a suggestion note.')
      return
    }

    setIsSubmittingRequest(true)

    try {
      await addDoc(collection(db, 'profileChangeRequests'), {
        studentUid: user.uid,
        studentName,
        enrollmentNumber,
        studentEmail: profile.email || user.email || '',
        requestedChanges,
        suggestionNote: nextNote,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      setRequestMessage('Change request sent to ERP Admin for approval.')
      setRequestNote('')
    } catch {
      setRequestError('Unable to submit request. Please try again.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  const handleSelfieSelect = (event) => {
    setSelfieError('')
    setSelfieMessage('')

    const file = event.target.files?.[0]
    if (!file) {
      setSelfieFile(null)
      setSelfiePreviewUrl('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setSelfieError('Please select a valid image file.')
      setSelfieFile(null)
      setSelfiePreviewUrl('')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelfieError('Selfie image size must be 5MB or less.')
      setSelfieFile(null)
      setSelfiePreviewUrl('')
      return
    }

    if (selfiePreviewUrl) {
      URL.revokeObjectURL(selfiePreviewUrl)
    }

    setSelfieFile(file)
    setSelfiePreviewUrl(URL.createObjectURL(file))
  }

  const handleSelfieUpload = async (event) => {
    event.preventDefault()
    setSelfieError('')
    setSelfieMessage('')

    if (!user?.uid) {
      setSelfieError('Unable to identify student session.')
      return
    }

    if (!selfieFile) {
      setSelfieError('Please select a selfie image first.')
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setSelfieError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend .env.')
      return
    }

    setIsUploadingSelfie(true)

    try {
      const bucketName = import.meta.env.VITE_SUPABASE_SELFIE_BUCKET || 'student-selfies'
      const objectPath = `${user.uid}/profile-selfie-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(objectPath, selfieFile, {
          cacheControl: '3600',
          contentType: selfieFile.type || 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(objectPath)
      const selfieUrl = publicUrlData?.publicUrl || ''

      if (!selfieUrl) {
        throw new Error('Unable to generate selfie URL from Supabase.')
      }

      await updateDoc(doc(db, 'users', user.uid), {
        selfieUrl,
        selfieUpdatedAt: new Date().toISOString(),
      })

      setProfile((prev) => ({
        ...(prev || {}),
        selfieUrl,
      }))
      setSelfieMessage('Selfie uploaded successfully.')
      setSelfieFile(null)
      if (selfiePreviewUrl) {
        URL.revokeObjectURL(selfiePreviewUrl)
      }
      setSelfiePreviewUrl('')
    } catch {
      setSelfieError('Unable to upload selfie right now. Please try again.')
    } finally {
      setIsUploadingSelfie(false)
    }
  }

  const profileRows = [
    { label: 'Full Name', value: studentName },
    { label: 'Enrollment Number', value: enrollmentNumber },
    { label: 'Email', value: profile?.email || user?.email || 'N/A' },
    { label: 'Department', value: profile?.department || 'N/A' },
    { label: 'Semester', value: profile?.semester || 'N/A' },
    { label: 'Phone', value: profile?.phone || 'N/A' },
    { label: 'Attendance', value: attendanceLabel },
    { label: 'Selfie Verification', value: hasSelfie ? 'Uploaded' : 'Mandatory upload pending' },
    { label: 'Fee Status', value: feeStatus },
    { label: 'Pending Assignments', value: isLoading ? 'Loading...' : pendingAssignmentsCount },
  ]

  return (
    <div className="auth-card dashboard-card">
      <header className="student-navbar">
        <div className="student-brand">
          <div className="student-brand-badge">PU</div>
          <div>
            <p className="student-university-name">PCU University</p>
            <p className="student-university-subtitle">Student ERP Portal</p>
          </div>
        </div>

        <nav className="student-nav-tabs" aria-label="Student navigation">
          <button
            type="button"
            className={activeView === 'summary' ? 'active' : ''}
            onClick={() => setActiveView('summary')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === 'profile' ? 'active' : ''}
            onClick={() => setActiveView('profile')}
          >
            Profile

          </button>
          <button
            type="button"
            className={activeView === 'attendance' ? 'active' : ''}
            onClick={() => setActiveView('attendance')}
          >
            Mark Attendance
          </button>
        </nav>
        <div className="topbar-actions">
          <div className="student-avatar" title={studentName}>
            {profile?.selfieUrl ? (
              <img src={profile.selfieUrl} alt="Student avatar" />
            ) : (
              <span>{(studentName || 'S').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button type="button" className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="student-top-row">
        <p className="dashboard-welcome">Welcome, {studentName}</p>
      </div>

      {loadError && (
        <p className="field-error" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !hasSelfie && activeView === 'summary' && (
        <div className="mandatory-popup-overlay" role="alertdialog" aria-modal="true">
          <div className="mandatory-popup">
            <h3>Selfie Upload Required</h3>
            <p>
              Upload your selfie to continue. This is mandatory for the upcoming attendance
              verification feature.
            </p>
            <div className="mandatory-popup-actions">
              <button type="button" className="secondary-btn" onClick={() => setActiveView('profile')}>
                Go to Profile Upload
              </button>
              <button type="button" className="logout-btn" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'summary' && (
        <>
          {!activeModule && (
            <section className="admin-panel-card erp-modules-section">
              <div className="erp-modules-head">
                <h3>Student ERP Modules</h3>
                <p>Ready for integration with dedicated module dashboards</p>
              </div>

              <div className="erp-modules-grid">
                {moduleCards.map((module) => (
                  <article
                    key={module.name}
                    className={`erp-module-card pcu-module-card ${activeModule?.name === module.name ? 'module-active' : ''}`}
                    onClick={() => handleModuleClick(module.path)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleModuleClick(module.path)
                      }
                    }}
                  >
                    <div className="pcu-module-top">
                      <h4>{module.name}</h4>
                    </div>
                    <div className="pcu-module-bottom">
                      <span className="pcu-module-icon">{module.code}</span>
                      <p>Open</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeModule && (
            <section className="admin-panel-card academic-open-panel" aria-label="Selected module page">
              <div className="erp-modules-head">
                <h3>{activeModule.name}</h3>
                <button type="button" className="secondary-btn" onClick={goToDashboardRoute}>
                  Back to Dashboard
                </button>
              </div>

              {activeModule.type === 'academic' ? (
                <>
                  <p className="login-hint">Student profile and academic summary</p>
                  <div className="module-detail-grid">
                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">AT</span>
                        <h4>Attendance</h4>
                      </div>
                      <p className="module-main-value">Overall: {attendanceLabel}</p>
                      <ul className="module-list">
                        {subjectAttendance.map((item) => (
                          <li key={item.subject}>{item.subject}: {item.percentage}</li>
                        ))}
                      </ul>
                      <p className={`status-pill ${isDefaulter ? 'danger' : 'ok'}`}>
                        {isLoading ? 'Loading...' : isDefaulter ? 'Defaulter Warning' : 'Good Standing'}
                      </p>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">TT</span>
                        <h4>Timetable</h4>
                      </div>
                      <ul className="module-list">
                        {todaySchedule.map((item) => (
                          <li key={item.subject}>{item.subject} - {item.time}</li>
                        ))}
                      </ul>
                      <button type="button" className="secondary-btn">View Full Timetable</button>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">AS</span>
                        <h4>Assignments</h4>
                      </div>
                      <p className="module-main-value">
                        Pending: {isLoading ? 'Loading...' : pendingAssignmentsCount}
                      </p>
                      <ul className="module-list">
                        {assignmentItems.map((item) => (
                          <li key={item.title}>{item.title} - Due {item.deadline}</li>
                        ))}
                      </ul>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">IM</span>
                        <h4>Internal Marks</h4>
                      </div>
                      <ul className="module-list">
                        {internalMarks.map((item) => (
                          <li key={item.subject}>{item.subject}: {item.marks}</li>
                        ))}
                      </ul>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">PR</span>
                        <h4>Profile Snapshot</h4>
                      </div>
                      <ul className="module-list">
                        {academicDetails.map((item) => (
                          <li key={item.label}>{item.label}: {item.value}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'fees' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">FE</span>
                        <h4>Fee Summary</h4>
                      </div>
                      <ul className="module-list">
                        <li>Total Fees: INR {totalFees}</li>
                        <li>Paid Amount: INR {paidAmount}</li>
                        <li>Pending Amount: INR {pendingAmount}</li>
                        <li>Penalty: INR {penaltyAmount}</li>
                      </ul>
                      <p className={`status-pill ${pendingAmount > 0 ? 'danger' : 'ok'}`}>
                        {pendingAmount > 0 ? 'Pending' : 'Paid'}
                      </p>
                      <button type="button" className="submit-btn">Pay Now</button>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'complaint' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">CP</span>
                        <h4>Campus Complaints</h4>
                      </div>
                      <button type="button" className="secondary-btn">Submit Complaint</button>
                      <ul className="module-list">
                        {complaintItems.map((item) => (
                          <li key={item.title}>{item.title} - {item.status}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'lost-found' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">LF</span>
                        <h4>Lost and Found</h4>
                      </div>
                      <div className="inline-actions">
                        <button type="button" className="secondary-btn">Report Lost Item</button>
                        <button type="button" className="secondary-btn">View Found Items</button>
                      </div>
                      <ul className="module-list">
                        {foundItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p className="module-main-value">Matched Items</p>
                      <ul className="module-list">
                        {matchedItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'collaboration' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">CB</span>
                        <h4>Collaboration Board</h4>
                      </div>

                      <form className="collab-form" onSubmit={handleCreateCollaborationPost}>
                        <label htmlFor="collab-title">Title</label>
                        <input
                          id="collab-title"
                          type="text"
                          value={collabTitle}
                          onChange={(event) => setCollabTitle(event.target.value)}
                          placeholder="Enter collaboration title"
                        />

                        <label htmlFor="collab-type">Type</label>
                        <select
                          id="collab-type"
                          value={collabType}
                          onChange={(event) => setCollabType(event.target.value)}
                        >
                          <option value="Project">Project</option>
                          <option value="Hackathon">Hackathon</option>
                          <option value="Research">Research</option>
                          <option value="Book">Book</option>
                        </select>

                        <label htmlFor="collab-description">Description</label>
                        <textarea
                          id="collab-description"
                          rows={3}
                          value={collabDescription}
                          onChange={(event) => setCollabDescription(event.target.value)}
                          placeholder="Describe your collaboration requirement"
                        />

                        {collabError && <p className="field-error">{collabError}</p>}
                        {collabMessage && <p className="field-success">{collabMessage}</p>}

                        <button type="submit" className="submit-btn" disabled={isSubmittingCollabPost}>
                          {isSubmittingCollabPost ? 'Posting...' : 'Create Post'}
                        </button>
                      </form>
                    </article>
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">CB</span>
                        <h4>All Collaboration Posts</h4>
                      </div>

                      {isLoadingCollabPosts ? (
                        <p className="login-hint">Loading posts...</p>
                      ) : collabPosts.length === 0 ? (
                        <p className="login-hint">No posts yet. Create the first collaboration post.</p>
                      ) : (
                        <div className="collab-post-grid">
                          {collabPosts.map((post) => {
                            const joinedBy = Array.isArray(post.joinedBy) ? post.joinedBy : []
                            const joinRequests = Array.isArray(post.joinRequests) ? post.joinRequests : []
                            const alreadyJoined = joinedBy.some((entry) => entry.joinerUid === user?.uid)
                            const hasPendingRequest = joinRequests.some((entry) => entry.joinerUid === user?.uid)
                            const isOwner = Boolean(post.studentUid) && post.studentUid === user?.uid

                            return (
                              <article key={post.id} className="collab-post-card">
                                <div className="collab-post-head">
                                  <strong>{post.studentName || 'Student'}</strong>
                                  <span className={`type-badge ${getTypeBadgeClass(post.type)}`}>
                                    {post.type}
                                  </span>
                                </div>
                                <h5>{post.title}</h5>
                                <p>{post.description}</p>
                                <div className="collab-post-foot">
                                  <span>{formatCollabDate(post.createdAt)}</span>
                                  {!isOwner ? (
                                    <button
                                      type="button"
                                      className="secondary-btn"
                                      disabled={alreadyJoined || isProcessingCollabAction}
                                      onClick={() => {
                                        if (hasPendingRequest) {
                                          handleCancelJoinRequest(post.id)
                                        } else {
                                          handleRequestToJoinCollaborationPost(post.id)
                                        }
                                      }}
                                    >
                                      {alreadyJoined
                                        ? 'Joined'
                                        : hasPendingRequest
                                          ? 'Cancel Request'
                                          : 'Request'}
                                    </button>
                                  ) : (
                                    <span className="status-pill ok">Post Owner</span>
                                  )}
                                </div>

                                {isOwner && (
                                  <div className="owner-request-panel">
                                    <p className="module-main-value">Join Requests</p>
                                    {joinRequests.length === 0 ? (
                                      <p className="login-hint">No pending requests yet.</p>
                                    ) : (
                                      <div className="request-list-wrap">
                                        {joinRequests.map((request) => (
                                          <div key={`${post.id}-${request.joinerUid}`} className="request-row">
                                            <div>
                                              <strong>{request.joinerName || 'Student'}</strong>
                                              <p>Email: {request.joinerEmail || 'N/A'}</p>
                                              <p>Mobile: {request.joinerMobile || 'N/A'}</p>
                                            </div>
                                            <div className="inline-actions">
                                              <button
                                                type="button"
                                                className="submit-btn"
                                                disabled={isProcessingCollabAction}
                                                onClick={() => handleJoinRequestDecision(post.id, request.joinerUid, 'accept')}
                                              >
                                                Accept
                                              </button>
                                              <button
                                                type="button"
                                                className="secondary-btn"
                                                disabled={isProcessingCollabAction}
                                                onClick={() => handleJoinRequestDecision(post.id, request.joinerUid, 'reject')}
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </article>
                            )
                          })}
                        </div>
                      )}
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'doubt' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">AI</span>
                        <h4>AI Doubt Chat</h4>
                      </div>

                      <div className="doubt-chat-box">
                        {doubtThread.map((message, index) => (
                          <p
                            key={`${message.role}-${index}`}
                            className={`chat-bubble ${message.role === 'student' ? 'student' : 'assistant'}`}
                          >
                            {message.text}
                          </p>
                        ))}
                      </div>

                      <form className="inline-actions" onSubmit={handleAskDoubt}>
                        <input
                          type="text"
                          value={doubtQuestion}
                          onChange={(event) => setDoubtQuestion(event.target.value)}
                          placeholder="Ask your question"
                        />
                        <button type="submit" className="secondary-btn">Ask</button>
                      </form>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'placement' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">PL</span>
                        <h4>Placement Tracker</h4>
                      </div>
                      <ul className="module-list">
                        {placementCompanies.map((item) => (
                          <li key={item.name}>
                            {item.name} - {item.eligible} - {item.applied ? 'Applied' : 'Not Applied'}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </>
              ) : (
                <p className="login-hint">
                  {moduleContent[activeModule.name] || 'Module page is ready for integration.'}
                </p>
              )}
            </section>
          )}
        </>
      )}

      {activeView === 'attendance' && <AttendanceQRScanner user={user} />}

      {activeView === 'profile' && (
        <section className="admin-panel-card student-profile-panel">
          <h3>Student Profile Details</h3>
          <p className="login-hint">Profile is read-only. Use request form below to suggest updates.</p>

          <div className="profile-details-grid">
            {profileRows.map((row) => (
              <article key={row.label} className="profile-detail-item">
                <h4>{row.label}</h4>
                <p>{row.value}</p>
              </article>
            ))}
          </div>

          <form className="auth-form request-form selfie-upload-form" onSubmit={handleSelfieUpload}>
            <h4>Upload Selfie (Mandatory)</h4>
            <p className="login-hint">
              This selfie will be used for attendance verification. Upload a clear face photo.
            </p>

            {profile?.selfieUrl && (
              <div className="existing-selfie-wrap">
                <span>Current selfie:</span>
                <img src={profile.selfieUrl} alt="Student selfie" className="selfie-preview" />
              </div>
            )}

            <label htmlFor="student-selfie">Select Selfie Image</label>
            <input
              id="student-selfie"
              type="file"
              accept="image/*"
              onChange={handleSelfieSelect}
              required={!hasSelfie}
            />

            {selfiePreviewUrl && (
              <div className="new-selfie-preview-wrap">
                <span>Selected selfie preview:</span>
                <img src={selfiePreviewUrl} alt="Selected selfie preview" className="selfie-preview" />
              </div>
            )}

            {selfieError && (
              <p className="field-error" role="alert">
                {selfieError}
              </p>
            )}

            {selfieMessage && (
              <p className="field-success" role="status">
                {selfieMessage}
              </p>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={isUploadingSelfie || !selfieFile}
            >
              {isUploadingSelfie ? 'Uploading Selfie...' : 'Upload Selfie'}
            </button>
          </form>

          <form className="auth-form request-form" onSubmit={handleProfileChangeRequest}>
            <h4>Request Profile Changes</h4>

            <label htmlFor="request-name">Suggested Full Name</label>
            <input
              id="request-name"
              type="text"
              value={requestName}
              onChange={(event) => setRequestName(event.target.value)}
              placeholder="Enter corrected full name"
            />

            <label htmlFor="request-department">Suggested Department</label>
            <input
              id="request-department"
              type="text"
              value={requestDepartment}
              onChange={(event) => setRequestDepartment(event.target.value)}
              placeholder="Enter corrected department"
            />

            <label htmlFor="request-semester">Suggested Semester</label>
            <input
              id="request-semester"
              type="number"
              min="1"
              value={requestSemester}
              onChange={(event) => setRequestSemester(event.target.value)}
              placeholder="Enter corrected semester"
            />

            <label htmlFor="request-phone">Suggested Phone</label>
            <input
              id="request-phone"
              type="tel"
              value={requestPhone}
              onChange={(event) => setRequestPhone(event.target.value)}
              placeholder="Enter corrected phone number"
            />

            <label htmlFor="request-note">Suggestion Note</label>
            <textarea
              id="request-note"
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              placeholder="Explain why this profile change is required"
              rows={3}
            />

            {requestError && (
              <p className="field-error" role="alert">
                {requestError}
              </p>
            )}

            {requestMessage && (
              <p className="field-success" role="status">
                {requestMessage}
              </p>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmittingRequest}>
              {isSubmittingRequest ? 'Sending Request...' : 'Request Changes'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}

export default StudentDashboard
