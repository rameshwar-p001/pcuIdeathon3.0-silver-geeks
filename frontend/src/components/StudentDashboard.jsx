import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'

import StudentAttendanceOverview from './StudentAttendanceOverview'
import PlacementTraining from './PlacementTraining'
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
const TIMETABLE_ROUTE_PATH = '/Timetable'

function StudentDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [attendancePercentage, setAttendancePercentage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeView, setActiveView] = useState('summary')
  const [showPlacementTraining, setShowPlacementTraining] = useState(false)
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
  const [doubtSubject, setDoubtSubject] = useState('')
  const [doubtQuestion, setDoubtQuestion] = useState('')
  const [doubtMode, setDoubtMode] = useState('manual')
  const [aiDoubtSubject, setAiDoubtSubject] = useState('')
  const [aiDoubtQuestion, setAiDoubtQuestion] = useState('')
  const [isAiChatFullscreen, setIsAiChatFullscreen] = useState(false)
  const [isSubmittingAiDoubt, setIsSubmittingAiDoubt] = useState(false)
  const [aiDoubtThread, setAiDoubtThread] = useState([
    {
      role: 'assistant',
      text: 'Ask using AI mode to get an instant Gemini response.',
    },
  ])
  const [doubtReferenceFile, setDoubtReferenceFile] = useState(null)
  const [doubtReferencePreview, setDoubtReferencePreview] = useState('')
  const [doubtSubmitError, setDoubtSubmitError] = useState('')
  const [doubtSubmitMessage, setDoubtSubmitMessage] = useState('')
  const [isSubmittingDoubt, setIsSubmittingDoubt] = useState(false)
  const [studentDoubts, setStudentDoubts] = useState([])
  const [complaintType, setComplaintType] = useState('')
  const [complaintPriority, setComplaintPriority] = useState('medium')
  const [complaintDescription, setComplaintDescription] = useState('')
  const [complaintPhotoFile, setComplaintPhotoFile] = useState(null)
  const [complaintPhotoPreview, setComplaintPhotoPreview] = useState('')
  const [complaintSubmitError, setComplaintSubmitError] = useState('')
  const [complaintSubmitMessage, setComplaintSubmitMessage] = useState('')
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false)
  const [studentComplaints, setStudentComplaints] = useState([])
  const [lostItemName, setLostItemName] = useState('')
  const [lostItemCategory, setLostItemCategory] = useState('')
  const [lostItemDescription, setLostItemDescription] = useState('')
  const [lostItemPhotoFile, setLostItemPhotoFile] = useState(null)
  const [lostItemPhotoPreview, setLostItemPhotoPreview] = useState('')
  const [lostFoundError, setLostFoundError] = useState('')
  const [lostFoundMessage, setLostFoundMessage] = useState('')
  const [isSubmittingLostItem, setIsSubmittingLostItem] = useState(false)
  const [isUpdatingLostFound, setIsUpdatingLostFound] = useState(false)
  const [lostFoundItems, setLostFoundItems] = useState([])
  const [placementCompanies, setPlacementCompanies] = useState([])
  const [placementApplications, setPlacementApplications] = useState([])
  const [placementGrievances, setPlacementGrievances] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [applicationResumeFile, setApplicationResumeFile] = useState(null)
  const [applicationSkillsInput, setApplicationSkillsInput] = useState('')
  const [applicationCgpi, setApplicationCgpi] = useState('8')
  const [placementApplyError, setPlacementApplyError] = useState('')
  const [placementApplyMessage, setPlacementApplyMessage] = useState('')
  const [isSubmittingPlacementApply, setIsSubmittingPlacementApply] = useState(false)
  const [placementGrievanceSubject, setPlacementGrievanceSubject] = useState('')
  const [placementGrievanceDescription, setPlacementGrievanceDescription] = useState('')
  const [placementGrievanceError, setPlacementGrievanceError] = useState('')
  const [placementGrievanceMessage, setPlacementGrievanceMessage] = useState('')
  const [isSubmittingPlacementGrievance, setIsSubmittingPlacementGrievance] = useState(false)
  const [examConfig, setExamConfig] = useState({ formOpen: false, formDeadline: '' })
  const [examForms, setExamForms] = useState([])
  const [examTimetableRows, setExamTimetableRows] = useState([])
  const [examHallTicketRows, setExamHallTicketRows] = useState([])
  const [examResultRows, setExamResultRows] = useState([])
  const [examNotifications, setExamNotifications] = useState([])
  const [examSelectedSubjectsInput, setExamSelectedSubjectsInput] = useState('')
  const [examFormError, setExamFormError] = useState('')
  const [examFormMessage, setExamFormMessage] = useState('')
  const [isSubmittingExamForm, setIsSubmittingExamForm] = useState(false)
  const [examGrievances, setExamGrievances] = useState([])
  const [examGrievanceSubject, setExamGrievanceSubject] = useState('')
  const [examGrievanceDescription, setExamGrievanceDescription] = useState('')
  const [examGrievanceError, setExamGrievanceError] = useState('')
  const [examGrievanceMessage, setExamGrievanceMessage] = useState('')
  const [isSubmittingExamGrievance, setIsSubmittingExamGrievance] = useState(false)
  const [skillDraft, setSkillDraft] = useState('')
  const [skillError, setSkillError] = useState('')
  const [skillMessage, setSkillMessage] = useState('')
  const [isSavingSkills, setIsSavingSkills] = useState(false)
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('')
  const [selfieError, setSelfieError] = useState('')
  const [selfieMessage, setSelfieMessage] = useState('')
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false)
  const [realtimeAttendanceRows, setRealtimeAttendanceRows] = useState([])
  const [realtimeTimetableRows, setRealtimeTimetableRows] = useState([])
  const [gitHubUrl, setGitHubUrl] = useState('')
  const [gitHubScore, setGitHubScore] = useState(null)
  const [gitHubError, setGitHubError] = useState('')
  const [gitHubMessage, setGitHubMessage] = useState('')
  const [isUpdatingGitHub, setIsUpdatingGitHub] = useState(false)

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
  const normalizeClassValue = (value) => String(value || '').trim().toLowerCase()

  // Get dynamic gradient color based on GitHub score
  const getScoreColor = (score) => {
    const numScore = Number(score) || 0;
    if (numScore >= 4) {
      // Green for excellent (4-5)
      return ['#27ae60', '#2ecc71'];
    } else if (numScore >= 2.5) {
      // Orange for good/medium (2.5-4)
      return ['#f39c12', '#f1c40f'];
    } else {
      // Red for poor (0-2.5)
      return ['#e74c3c', '#c0392b'];
    }
  }

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
        setGitHubUrl(profileData.gitHubProfile?.url || '')
        setGitHubScore(profileData.gitHubScore || null)

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

    const classCandidateVariants = Array.from(
      new Set(
        classCandidates.flatMap((candidate) => {
          const raw = String(candidate || '').trim()
          const normalized = normalizeClassValue(candidate)
          const upper = normalized.toUpperCase()
          return [raw, normalized, upper].filter(Boolean)
        }),
      ),
    )

    if (classCandidateVariants.length === 0) {
      setRealtimeTimetableRows([])
      return () => {}
    }

    const unsubscribers = []
    const bySourceMap = new Map()

    classCandidateVariants.forEach((candidate) => {
      ;['class_id', 'classId'].forEach((fieldName) => {
        const sourceKey = `${fieldName}:${candidate}`
        const timetableQuery = query(collection(db, 'timetable'), where(fieldName, '==', candidate))
        const unsubscribe = onSnapshot(timetableQuery, (snapshot) => {
          bySourceMap.set(
            sourceKey,
            snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
          )
          const merged = Array.from(bySourceMap.values()).flat()
          const unique = Array.from(new Map(merged.map((row) => [row.id, row])).values())
          setRealtimeTimetableRows(unique)
        })
        unsubscribers.push(unsubscribe)
      })
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

      if (doubtReferencePreview) {
        URL.revokeObjectURL(doubtReferencePreview)
      }

      if (complaintPhotoPreview) {
        URL.revokeObjectURL(complaintPhotoPreview)
      }

      if (lostItemPhotoPreview) {
        URL.revokeObjectURL(lostItemPhotoPreview)
      }
    }
  }, [selfiePreviewUrl, doubtReferencePreview, complaintPhotoPreview, lostItemPhotoPreview])

  useEffect(() => {
    if (!isAiChatFullscreen) {
      return () => {}
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAiChatFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAiChatFullscreen])

  useEffect(() => {
    if (!user?.uid) {
      setStudentDoubts([])
      return () => {}
    }

    const doubtsQuery = query(collection(db, 'studentDoubts'), where('studentUid', '==', user.uid))
    const unsubscribe = onSnapshot(doubtsQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setStudentDoubts(rows)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setStudentComplaints([])
      return () => {}
    }

    const complaintsQuery = query(collection(db, 'campusComplaints'), where('studentUid', '==', user.uid))
    const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setStudentComplaints(rows)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'placementCompanies'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setPlacementCompanies(rows)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      setPlacementApplications([])
      return () => {}
    }

    const placementApplicationsQuery = query(collection(db, 'placementApplications'), where('studentUid', '==', user.uid))
    const unsubscribe = onSnapshot(placementApplicationsQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setPlacementApplications(rows)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setPlacementGrievances([])
      return () => {}
    }

    const placementGrievanceQuery = query(collection(db, 'placementGrievances'), where('studentUid', '==', user.uid))
    const unsubscribe = onSnapshot(placementGrievanceQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setPlacementGrievances(rows)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setExamForms([])
      setExamHallTicketRows([])
      setExamResultRows([])
      setExamGrievances([])
      return () => {}
    }

    const examFormQuery = query(collection(db, 'examForms'), where('studentUid', '==', user.uid))
    const examHallTicketQuery = query(collection(db, 'examHallTickets'), where('studentUid', '==', user.uid))
    const examResultsQuery = query(collection(db, 'examResults'), where('studentUid', '==', user.uid))
    const examGrievanceQuery = query(collection(db, 'examGrievances'), where('studentUid', '==', user.uid))

    const unsubscribeExamForms = onSnapshot(examFormQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => (Date.parse(b.updatedAt || b.createdAt || '') || 0) - (Date.parse(a.updatedAt || a.createdAt || '') || 0))
      setExamForms(rows)
    })

    const unsubscribeExamHallTickets = onSnapshot(examHallTicketQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setExamHallTicketRows(rows)
    })

    const unsubscribeExamResults = onSnapshot(examResultsQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setExamResultRows(rows)
    })

    const unsubscribeExamGrievances = onSnapshot(examGrievanceQuery, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => (Date.parse(b.updatedAt || b.createdAt || '') || 0) - (Date.parse(a.updatedAt || a.createdAt || '') || 0))
      setExamGrievances(rows)
    })

    return () => {
      unsubscribeExamForms()
      unsubscribeExamHallTickets()
      unsubscribeExamResults()
      unsubscribeExamGrievances()
    }
  }, [user?.uid])

  useEffect(() => {
    const unsubscribeExamConfig = onSnapshot(doc(db, 'examConfig', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const value = snapshot.data()
        setExamConfig({
          formOpen: Boolean(value.formOpen),
          formDeadline: value.formDeadline || '',
        })
        return
      }

      setExamConfig({ formOpen: false, formDeadline: '' })
    })

    const unsubscribeExamNotifications = onSnapshot(collection(db, 'examNotifications'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
      setExamNotifications(rows)
    })

    return () => {
      unsubscribeExamConfig()
      unsubscribeExamNotifications()
    }
  }, [])

  useEffect(() => {
    const classId = String(profile?.classId || profile?.class_id || '').trim().toLowerCase()
    const department = String(profile?.department || '').trim()

    if (!classId && !department) {
      setExamTimetableRows([])
      return () => {}
    }

    let departmentRows = []
    let classRows = []

    const mergeAndSetRows = () => {
      const merged = [...departmentRows, ...classRows]
      const uniqueRows = Array.from(new Map(merged.map((row) => [row.id, row])).values())
      uniqueRows.sort((a, b) => {
        const aDate = Date.parse(a.date || '') || 0
        const bDate = Date.parse(b.date || '') || 0
        if (aDate !== bDate) {
          return aDate - bDate
        }
        return String(a.time || '').localeCompare(String(b.time || ''))
      })
      setExamTimetableRows(uniqueRows)
    }

    const unsubscribers = []

    if (department) {
      const departmentQuery = query(collection(db, 'examTimetable'), where('department', '==', department))
      const unsubscribeDepartment = onSnapshot(departmentQuery, (snapshot) => {
        departmentRows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        mergeAndSetRows()
      })
      unsubscribers.push(unsubscribeDepartment)
    }

    if (classId) {
      const classIdQuery = query(collection(db, 'examTimetable'), where('classId', '==', classId))
      const unsubscribeClassId = onSnapshot(classIdQuery, (snapshot) => {
        classRows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        mergeAndSetRows()
      })
      unsubscribers.push(unsubscribeClassId)
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [profile?.classId, profile?.class_id, profile?.department])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'lostFoundItems'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setLostFoundItems(rows)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const nextCgpi = Number(profile?.cgpi) > 0 ? Number(profile.cgpi) : 8
    const nextSkills = Array.isArray(profile?.skills) ? profile.skills : []
    setApplicationCgpi(String(nextCgpi))
    setApplicationSkillsInput(nextSkills.join(', '))
  }, [profile?.cgpi, profile?.skills])

  useEffect(() => {
    const syncRoute = () => {
      const currentPath = window.location.pathname

      if (currentPath.toLowerCase() === TIMETABLE_ROUTE_PATH.toLowerCase()) {
        setActiveRoutePath(TIMETABLE_ROUTE_PATH)
        return
      }

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
  const studentCgpi = Number(profile?.cgpi) > 0 ? Number(profile.cgpi) : 8
  const studentSkills = Array.isArray(profile?.skills) ? profile.skills : []
  const studentBranch = String(profile?.department || '').trim()
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

  const subjectAttendance = useMemo(() => {
    const grouped = new Map()
    const subjectDisplayByKey = new Map()
    const normalizeSubject = (value) => String(value || '').trim().toLowerCase()

    const timetableSubjectBySlot = new Map(
      realtimeTimetableRows.map((row) => {
        const dayKey = String(row.day || '').trim().toLowerCase()
        const timeKey = String(row.time_slot || '').trim().toLowerCase()
        return [`${dayKey}|${timeKey}`, row.subject || 'General']
      }),
    )

    // Seed subject list from timetable so attendance card always reflects timetable subjects.
    realtimeTimetableRows.forEach((row) => {
      const subjectName = String(row.subject || '').trim() || 'General'
      const subjectKey = normalizeSubject(subjectName)

      if (!grouped.has(subjectKey)) {
        grouped.set(subjectKey, { present: 0, total: 0 })
      }

      if (!subjectDisplayByKey.has(subjectKey)) {
        subjectDisplayByKey.set(subjectKey, subjectName)
      }
    })

    realtimeAttendanceRows.forEach((record) => {
      const status = String(record.status || '').toLowerCase()
      const isPresent = status === 'present' || Boolean(record.qrVerified)
      const isCounted = status === 'present' || status === 'absent' || status === 'leave' || Boolean(record.qrVerified)

      if (!isCounted) {
        return
      }

      const rowSubject = String(record.subject || '').trim()
      const slotKey = `${String(record.day || '').trim().toLowerCase()}|${String(record.time_slot || '').trim().toLowerCase()}`
      const resolvedSubject = rowSubject || timetableSubjectBySlot.get(slotKey) || 'General'
      const resolvedSubjectKey = normalizeSubject(resolvedSubject)

      const current = grouped.get(resolvedSubjectKey) || { present: 0, total: 0 }
      current.total += 1
      if (isPresent) {
        current.present += 1
      }
      grouped.set(resolvedSubjectKey, current)

      if (!subjectDisplayByKey.has(resolvedSubjectKey)) {
        subjectDisplayByKey.set(resolvedSubjectKey, resolvedSubject)
      }
    })

    return Array.from(grouped.entries())
      .map(([subjectKey, counts]) => {
        const percentageValue = counts.total > 0 ? Number(((counts.present / counts.total) * 100).toFixed(2)) : 0
        return {
          subject: subjectDisplayByKey.get(subjectKey) || subjectKey || 'General',
          present: counts.present,
          total: counts.total,
          percentageValue,
          percentage: `${percentageValue}%`,
        }
      })
      .sort((a, b) => a.subject.localeCompare(b.subject))
  }, [realtimeAttendanceRows, realtimeTimetableRows])

  useEffect(() => {
    const aggregate = subjectAttendance.reduce(
      (acc, item) => {
        acc.present += item.present
        acc.total += item.total
        return acc
      },
      { present: 0, total: 0 },
    )

    const calculatedPercentage = aggregate.total > 0
      ? Number(((aggregate.present / aggregate.total) * 100).toFixed(2))
      : 0

    setAttendancePercentage(calculatedPercentage)
  }, [subjectAttendance])

  const moduleCards = useMemo(() => ERP_MODULES, [])

  const activeModule = useMemo(
    () => moduleCards.find((module) => module.path === activeRoutePath) || null,
    [activeRoutePath, moduleCards],
  )

  const academicDetails = [
    { label: 'Student Name', value: studentName },
    { label: 'Enrollment No', value: enrollmentNumber },
    { label: 'CGPI', value: studentCgpi.toFixed(2) },
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

  const todaySchedule = useMemo(() => {
    const normalizeDay = (value) => String(value || '').trim().slice(0, 3).toLowerCase()
    const dayOrder = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 }

    return realtimeTimetableRows
      .map((row) => ({
        day: String(row.day || '').trim(),
        subject: row.subject || 'N/A',
        time: row.time_slot || 'N/A',
      }))
      .sort((a, b) => {
        const dayA = dayOrder[normalizeDay(a.day)] || 99
        const dayB = dayOrder[normalizeDay(b.day)] || 99
        if (dayA !== dayB) {
          return dayA - dayB
        }
        return String(a.time).localeCompare(String(b.time))
      })
  }, [realtimeTimetableRows])

  const timetableSubjectOptions = useMemo(() => {
    return Array.from(
      new Set(realtimeTimetableRows.map((row) => String(row.subject || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b))
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

  const publicLostItems = useMemo(
    () => lostFoundItems.filter((item) => String(item.status || 'lost').toLowerCase() !== 'returned'),
    [lostFoundItems],
  )

  const myLostItemUpdates = useMemo(
    () => lostFoundItems.filter((item) => item.ownerUid === user?.uid),
    [lostFoundItems, user?.uid],
  )

  const latestExamForm = examForms[0] || null
  const latestExamHallTicket = examHallTicketRows[0] || null
  const latestExamResult = examResultRows[0] || null
  const examSubjectsFromTimetable = useMemo(
    () => Array.from(new Set(examTimetableRows.map((row) => String(row.subject || '').trim()).filter(Boolean))),
    [examTimetableRows],
  )

  useEffect(() => {
    if (!latestExamForm || !Array.isArray(latestExamForm.subjects)) {
      if (examSubjectsFromTimetable.length > 0) {
        setExamSelectedSubjectsInput(examSubjectsFromTimetable.join(', '))
      }
      return
    }

    setExamSelectedSubjectsInput(latestExamForm.subjects.join(', '))
  }, [latestExamForm?.id, examSubjectsFromTimetable])

  const examSystemEligibility = useMemo(
    () => attendancePercentage >= 75 && feeStatus === 'Paid',
    [attendancePercentage, feeStatus],
  )

  const examSubjectsFromResult = useMemo(() => {
    if (!latestExamResult || !Array.isArray(latestExamResult.marks)) {
      return []
    }

    return latestExamResult.marks
  }, [latestExamResult])

  const examPerformanceSummary = useMemo(() => {
    if (!latestExamResult || !Array.isArray(latestExamResult.marks) || latestExamResult.marks.length === 0) {
      return {
        hasData: false,
        maxMarks: 0,
        minMarks: 0,
      }
    }

    const marks = latestExamResult.marks.map((item) => Number(item.marks) || 0)
    return {
      hasData: true,
      maxMarks: Math.max(...marks),
      minMarks: Math.min(...marks),
    }
  }, [latestExamResult])

  const collaborationPosts = [
    { title: 'Smart Campus Hackathon Team', category: 'Hackathon' },
    { title: 'AI Attendance Research Group', category: 'Research' },
  ]

  const handleSubmitExamForm = async (event) => {
    event.preventDefault()
    setExamFormError('')
    setExamFormMessage('')

    if (!user?.uid || !profile) {
      setExamFormError('Student session is unavailable. Please login again.')
      return
    }

    if (!examConfig.formOpen) {
      setExamFormError('Exam form is currently closed by Exam Coordinator.')
      return
    }

    const subjectInputValue = examSelectedSubjectsInput || examSubjectsFromTimetable.join(', ')
    const subjects = subjectInputValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (subjects.length === 0) {
      setExamFormError('Enter at least one subject (comma separated).')
      return
    }

    setIsSubmittingExamForm(true)

    try {
      const nowIso = new Date().toISOString()
      await setDoc(doc(db, 'examForms', user.uid), {
        studentUid: user.uid,
        studentName,
        studentEmail: profile.email || user.email || '',
        enrollmentNumber,
        classId: String(profile.classId || profile.class_id || '').toLowerCase(),
        subjects,
        attendancePercentage,
        feeStatus,
        systemEligibility: examSystemEligibility,
        coordinatorEligibility: latestExamForm?.coordinatorEligibility || 'pending',
        createdAt: latestExamForm?.createdAt || nowIso,
        updatedAt: nowIso,
      })

      setExamFormMessage('Exam form submitted successfully. Wait for coordinator verification.')
      setExamSelectedSubjectsInput(subjects.join(', '))
    } catch {
      setExamFormError('Unable to submit exam form right now.')
    } finally {
      setIsSubmittingExamForm(false)
    }
  }

  const handleDownloadHallTicketPdf = () => {
    if (!latestExamHallTicket) {
      return
    }

    const timetableRows = Array.isArray(latestExamHallTicket.timetable) ? latestExamHallTicket.timetable : []
    const subjectRows = Array.isArray(latestExamHallTicket.subjects) ? latestExamHallTicket.subjects : []

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      setExamFormError('Unable to open print preview. Please allow pop-ups for this site.')
      return
    }

    const html = `
      <html>
        <head>
          <title>Exam Hall Ticket</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
            h1, h2 { margin: 0 0 8px; }
            .meta { margin-bottom: 16px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .muted { color: #555; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>PCU University</h1>
          <h2>Exam Hall Ticket</h2>
          <div class="meta">
            <p><strong>Name:</strong> ${latestExamHallTicket.studentName || studentName}</p>
            <p><strong>Enrollment:</strong> ${latestExamHallTicket.enrollmentNumber || enrollmentNumber}</p>
            <p><strong>Class:</strong> ${latestExamHallTicket.classId || 'N/A'}</p>
            <p><strong>Exam Center:</strong> ${latestExamHallTicket.examCenter || 'N/A'}</p>
            <p><strong>Seat Number:</strong> ${latestExamHallTicket.seatNumber || 'N/A'}</p>
          </div>

          <h3>Registered Subjects</h3>
          <table>
            <thead><tr><th>#</th><th>Subject</th></tr></thead>
            <tbody>
              ${subjectRows.length === 0
                ? '<tr><td colspan="2">No subjects listed.</td></tr>'
                : subjectRows.map((subject, index) => `<tr><td>${index + 1}</td><td>${subject}</td></tr>`).join('')}
            </tbody>
          </table>

          <h3>Exam Timetable</h3>
          <table>
            <thead><tr><th>Subject</th><th>Date</th><th>Time</th></tr></thead>
            <tbody>
              ${timetableRows.length === 0
                ? '<tr><td colspan="3">Timetable not attached yet.</td></tr>'
                : timetableRows.map((row) => `<tr><td>${row.subject || 'N/A'}</td><td>${row.date || 'N/A'}</td><td>${row.time || 'N/A'}</td></tr>`).join('')}
            </tbody>
          </table>

          <p class="muted">Generated at: ${new Date().toLocaleString()}</p>
          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleSubmitExamGrievance = async (event) => {
    event.preventDefault()
    setExamGrievanceError('')
    setExamGrievanceMessage('')

    if (!user?.uid || !profile) {
      setExamGrievanceError('Student session is unavailable. Please login again.')
      return
    }

    const subject = examGrievanceSubject.trim()
    const description = examGrievanceDescription.trim()

    if (!subject || !description) {
      setExamGrievanceError('Subject and description are required.')
      return
    }

    setIsSubmittingExamGrievance(true)

    try {
      await addDoc(collection(db, 'examGrievances'), {
        studentUid: user.uid,
        studentName,
        studentEmail: profile.email || user.email || '',
        enrollmentNumber,
        subject,
        description,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      setExamGrievanceSubject('')
      setExamGrievanceDescription('')
      setExamGrievanceMessage('Exam grievance submitted successfully.')
    } catch {
      setExamGrievanceError('Unable to submit exam grievance right now.')
    } finally {
      setIsSubmittingExamGrievance(false)
    }
  }

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

  const handlePlacementTrainingBack = () => {
    setShowPlacementTraining(false)
    handleModuleClick('/Placement')
  }

  const goToTimetableRoute = () => {
    if (window.location.pathname !== TIMETABLE_ROUTE_PATH) {
      window.history.pushState({}, '', TIMETABLE_ROUTE_PATH)
    }
    setActiveRoutePath(TIMETABLE_ROUTE_PATH)
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

  const formatComplaintStatus = (value) => {
    const status = String(value || '').toLowerCase()
    if (status === 'in_process') return 'In Process'
    if (status === 'done') return 'Done'
    return 'Pending'
  }

  const formatPlacementStatus = (value) => {
    const status = String(value || '').toLowerCase()
    if (status === 'in_process') return 'In Process'
    if (!status) return 'Applied'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatLostFoundStatus = (value) => {
    const status = String(value || '').toLowerCase()
    if (status === 'claimed') return 'Found Reported'
    if (status === 'returned') return 'Returned'
    return 'Lost'
  }

  const handleLostItemPhotoSelect = (event) => {
    setLostFoundError('')
    setLostFoundMessage('')

    const file = event.target.files?.[0]
    if (!file) {
      setLostItemPhotoFile(null)
      setLostItemPhotoPreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setLostFoundError('Please select a valid image for lost item.')
      setLostItemPhotoFile(null)
      setLostItemPhotoPreview('')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setLostFoundError('Lost item photo must be 5MB or less.')
      setLostItemPhotoFile(null)
      setLostItemPhotoPreview('')
      return
    }

    if (lostItemPhotoPreview) {
      URL.revokeObjectURL(lostItemPhotoPreview)
    }

    setLostItemPhotoFile(file)
    setLostItemPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmitLostItem = async (event) => {
    event.preventDefault()
    setLostFoundError('')
    setLostFoundMessage('')

    if (!user?.uid || !profile) {
      setLostFoundError('Student session is unavailable. Please login again.')
      return
    }

    const itemName = String(lostItemName || '').trim()
    const category = String(lostItemCategory || '').trim()
    const description = String(lostItemDescription || '').trim()

    if (!itemName || !category || !description) {
      setLostFoundError('Item name, category and description are required.')
      return
    }

    setIsSubmittingLostItem(true)

    try {
      let photoUrl = ''
      let photoName = ''

      if (lostItemPhotoFile) {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase is not configured for lost item photo upload.')
        }

        const bucketName = import.meta.env.VITE_SUPABASE_LOST_FOUND_BUCKET || import.meta.env.VITE_SUPABASE_SELFIE_BUCKET || 'student-selfies'
        const extension = String(lostItemPhotoFile.name || '').split('.').pop() || 'jpg'
        const objectPath = `lost-found/${user.uid}/${Date.now()}-lost-item.${extension}`
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(objectPath, lostItemPhotoFile, {
            cacheControl: '3600',
            contentType: lostItemPhotoFile.type || 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath)
        photoUrl = publicUrlData?.publicUrl || ''
        photoName = lostItemPhotoFile.name || ''
      }

      const nowIso = new Date().toISOString()
      await addDoc(collection(db, 'lostFoundItems'), {
        ownerUid: user.uid,
        ownerName: studentName,
        ownerEmail: profile.email || user.email || '',
        ownerPhone: profile.phone || '',
        itemName,
        category,
        description,
        photoUrl,
        photoName,
        status: 'lost',
        finderUid: '',
        finderName: '',
        finderEmail: '',
        finderPhone: '',
        finderNote: '',
        statusHistory: [
          {
            from: 'new',
            to: 'lost',
            changedByUid: user.uid,
            changedByName: studentName,
            changedAt: nowIso,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      })

      setLostItemName('')
      setLostItemCategory('')
      setLostItemDescription('')
      setLostItemPhotoFile(null)
      if (lostItemPhotoPreview) {
        URL.revokeObjectURL(lostItemPhotoPreview)
      }
      setLostItemPhotoPreview('')
      setLostFoundMessage('Lost item posted successfully. Other students can now see it.')
    } catch (error) {
      setLostFoundError(error?.message || 'Unable to post lost item right now.')
    } finally {
      setIsSubmittingLostItem(false)
    }
  }

  const handleMarkItemFound = async (item) => {
    if (!item?.id || !profile || !user?.uid) {
      return
    }

    if (item.ownerUid === user.uid) {
      setLostFoundError('You cannot mark your own item as found by self.')
      return
    }

    if (String(item.status || '').toLowerCase() === 'returned') {
      setLostFoundError('This item is already marked as returned.')
      return
    }

    const finderNote = window.prompt('Optional note for owner (where/when found):', '')

    setIsUpdatingLostFound(true)
    setLostFoundError('')
    setLostFoundMessage('')

    try {
      const nowIso = new Date().toISOString()
      const nextHistory = [
        ...(Array.isArray(item.statusHistory) ? item.statusHistory : []),
        {
          from: item.status || 'lost',
          to: 'claimed',
          changedByUid: user.uid,
          changedByName: studentName,
          changedAt: nowIso,
          note: String(finderNote || '').trim(),
        },
      ]

      await updateDoc(doc(db, 'lostFoundItems', item.id), {
        status: 'claimed',
        finderUid: user.uid,
        finderName: studentName,
        finderEmail: profile.email || user.email || '',
        finderPhone: profile.phone || '',
        finderNote: String(finderNote || '').trim(),
        updatedAt: nowIso,
        statusHistory: nextHistory,
      })

      setLostFoundMessage('Marked as found. Owner can now contact you from Lost & Found updates.')
    } catch {
      setLostFoundError('Unable to mark item as found right now.')
    } finally {
      setIsUpdatingLostFound(false)
    }
  }

  const handleMarkItemReturned = async (item) => {
    if (!item?.id || item.ownerUid !== user?.uid) {
      return
    }

    setIsUpdatingLostFound(true)
    setLostFoundError('')
    setLostFoundMessage('')

    try {
      const nowIso = new Date().toISOString()
      const nextHistory = [
        ...(Array.isArray(item.statusHistory) ? item.statusHistory : []),
        {
          from: item.status || 'claimed',
          to: 'returned',
          changedByUid: user.uid,
          changedByName: studentName,
          changedAt: nowIso,
        },
      ]

      await updateDoc(doc(db, 'lostFoundItems', item.id), {
        status: 'returned',
        updatedAt: nowIso,
        returnedAt: nowIso,
        statusHistory: nextHistory,
      })

      setLostFoundMessage('Item marked as returned successfully.')
    } catch {
      setLostFoundError('Unable to mark item as returned right now.')
    } finally {
      setIsUpdatingLostFound(false)
    }
  }

  const getEligibilityForCompany = (company) => {
    const minCgpi = Number(company?.minCgpa) || 0
    const branchRules = Array.isArray(company?.allowedBranches)
      ? company.allowedBranches.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : []

    const studentBranchNormalized = String(studentBranch || '').trim().toLowerCase()
    const cgpiEligible = studentCgpi >= minCgpi
    const branchEligible = branchRules.length === 0 || branchRules.some((rule) => studentBranchNormalized.includes(rule))

    return {
      eligible: cgpiEligible && branchEligible,
      reason: !cgpiEligible
        ? `Minimum CGPI ${minCgpi.toFixed(2)} required.`
        : !branchEligible
          ? 'Branch is not eligible for this drive.'
          : 'You are eligible to apply.',
    }
  }

  const placementReadinessScore = useMemo(() => {
    const skillsCount = studentSkills.length
    return Number((((studentCgpi * 10) + attendancePercentage + (skillsCount * 5)) / 3).toFixed(2))
  }, [attendancePercentage, studentCgpi, studentSkills.length])

  const handleSaveSkillSet = async () => {
    setSkillError('')
    setSkillMessage('')

    if (!profile || !user?.uid) {
      setSkillError('Student profile is unavailable.')
      return
    }

    const incomingSkills = skillDraft
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (incomingSkills.length === 0) {
      setSkillError('Enter at least one skill separated by commas.')
      return
    }

    const nextSkills = Array.from(new Set([...studentSkills, ...incomingSkills]))
    setIsSavingSkills(true)

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        skills: nextSkills,
        cgpi: studentCgpi,
        updatedAt: new Date().toISOString(),
      })

      setProfile((prev) => ({
        ...(prev || {}),
        skills: nextSkills,
        cgpi: studentCgpi,
      }))
      setSkillDraft('')
      setSkillMessage('Skills updated successfully.')
    } catch {
      setSkillError('Unable to update skills right now.')
    } finally {
      setIsSavingSkills(false)
    }
  }

  const handleSubmitPlacementApplication = async (event, company) => {
    event.preventDefault()
    setPlacementApplyError('')
    setPlacementApplyMessage('')

    if (!user?.uid || !profile) {
      setPlacementApplyError('Student session is unavailable. Please login again.')
      return
    }

    if (!company?.id) {
      setPlacementApplyError('Invalid company selected.')
      return
    }

    const alreadyApplied = placementApplications.some((item) => item.companyId === company.id)
    if (alreadyApplied) {
      setPlacementApplyError('You already applied for this company.')
      return
    }

    const eligibility = getEligibilityForCompany(company)
    if (!eligibility.eligible) {
      setPlacementApplyError(eligibility.reason)
      return
    }

    const normalizedCgpi = Number.parseFloat(applicationCgpi)
    if (Number.isNaN(normalizedCgpi) || normalizedCgpi < 0 || normalizedCgpi > 10) {
      setPlacementApplyError('Please enter a valid CGPI between 0 and 10.')
      return
    }

    const parsedSkills = applicationSkillsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (parsedSkills.length === 0) {
      setPlacementApplyError('Please add at least one skill in apply form.')
      return
    }

    setIsSubmittingPlacementApply(true)

    try {
      let resumeUrl = ''
      let resumeName = ''

      if (applicationResumeFile) {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase is not configured for resume upload.')
        }

        const bucketName = import.meta.env.VITE_SUPABASE_RESUME_BUCKET || import.meta.env.VITE_SUPABASE_SELFIE_BUCKET || 'student-selfies'
        const extension = String(applicationResumeFile.name || '').split('.').pop() || 'pdf'
        const objectPath = `placement-resumes/${user.uid}/${Date.now()}-resume.${extension}`
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(objectPath, applicationResumeFile, {
            cacheControl: '3600',
            contentType: applicationResumeFile.type || 'application/pdf',
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath)
        resumeUrl = publicUrlData?.publicUrl || ''
        resumeName = applicationResumeFile.name || ''
      }

      const nowIso = new Date().toISOString()
      await addDoc(collection(db, 'placementApplications'), {
        studentUid: user.uid,
        studentName,
        studentEmail: profile.email || user.email || '',
        enrollmentNumber,
        companyId: company.id,
        companyName: company.companyName || 'N/A',
        companyRole: company.role || '',
        resumeUrl,
        resumeName,
        skills: parsedSkills,
        cgpi: normalizedCgpi,
        status: 'applied',
        statusHistory: [
          {
            from: 'new',
            to: 'applied',
            changedAt: nowIso,
            changedByUid: user.uid,
            changedByName: studentName,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      })

      setPlacementApplyMessage(`Applied successfully for ${company.companyName || 'company'}.`)
      setApplicationResumeFile(null)
      setSelectedCompanyId('')
    } catch (error) {
      setPlacementApplyError(error?.message || 'Unable to submit application right now.')
    } finally {
      setIsSubmittingPlacementApply(false)
    }
  }

  const handleSubmitPlacementGrievance = async (event) => {
    event.preventDefault()
    setPlacementGrievanceError('')
    setPlacementGrievanceMessage('')

    if (!user?.uid || !profile) {
      setPlacementGrievanceError('Student session is unavailable. Please login again.')
      return
    }

    const subject = placementGrievanceSubject.trim()
    const description = placementGrievanceDescription.trim()

    if (!subject || !description) {
      setPlacementGrievanceError('Subject and description are required for grievance.')
      return
    }

    setIsSubmittingPlacementGrievance(true)

    try {
      await addDoc(collection(db, 'placementGrievances'), {
        studentUid: user.uid,
        studentName,
        studentEmail: profile.email || user.email || '',
        enrollmentNumber,
        subject,
        description,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      setPlacementGrievanceSubject('')
      setPlacementGrievanceDescription('')
      setPlacementGrievanceMessage('Grievance submitted to placement cell.')
    } catch {
      setPlacementGrievanceError('Unable to submit grievance right now.')
    } finally {
      setIsSubmittingPlacementGrievance(false)
    }
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

  const handleDoubtReferenceSelect = (event) => {
    setDoubtSubmitError('')
    setDoubtSubmitMessage('')

    const file = event.target.files?.[0]
    if (!file) {
      setDoubtReferenceFile(null)
      setDoubtReferencePreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setDoubtSubmitError('Please choose a valid image file for reference photo.')
      setDoubtReferenceFile(null)
      setDoubtReferencePreview('')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setDoubtSubmitError('Reference image must be 5MB or less.')
      setDoubtReferenceFile(null)
      setDoubtReferencePreview('')
      return
    }

    if (doubtReferencePreview) {
      URL.revokeObjectURL(doubtReferencePreview)
    }

    setDoubtReferenceFile(file)
    setDoubtReferencePreview(URL.createObjectURL(file))
  }

  const handleAskDoubt = async (event) => {
    event.preventDefault()
    setDoubtSubmitError('')
    setDoubtSubmitMessage('')

    if (!user?.uid || !profile) {
      setDoubtSubmitError('Student session is unavailable. Please login again.')
      return
    }

    const selectedSubject = String(doubtSubject || '').trim()
    const question = doubtQuestion.trim()

    if (!selectedSubject || !question) {
      setDoubtSubmitError('Please select subject and enter your doubt.')
      return
    }

    const classId = normalizeClassValue(profile.class_id || profile.classId)
    const matchedTimetableRow = realtimeTimetableRows.find((row) => {
      const rowSubject = String(row.subject || '').trim().toLowerCase()
      const targetSubject = selectedSubject.toLowerCase()
      const rowClass = normalizeClassValue(row.class_id || row.classId)
      return rowSubject === targetSubject && (!rowClass || !classId || rowClass === classId)
    })

    const facultyUid = matchedTimetableRow?.faculty_id || matchedTimetableRow?.facultyId || ''
    if (!facultyUid) {
      setDoubtSubmitError('Subject teacher is not mapped in timetable for this subject.')
      return
    }

    setIsSubmittingDoubt(true)

    try {
      let referenceImageUrl = ''
      let referenceImageName = ''

      if (doubtReferenceFile) {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase is not configured for reference image upload.')
        }

        const bucketName = import.meta.env.VITE_SUPABASE_DOUBT_BUCKET || import.meta.env.VITE_SUPABASE_SELFIE_BUCKET || 'student-selfies'
        const extension = String(doubtReferenceFile.name || '').split('.').pop() || 'jpg'
        const objectPath = `doubts/${user.uid}/${Date.now()}-ref.${extension}`
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(objectPath, doubtReferenceFile, {
            cacheControl: '3600',
            contentType: doubtReferenceFile.type || 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath)
        referenceImageUrl = publicUrlData?.publicUrl || ''
        referenceImageName = doubtReferenceFile.name || ''
      }

      await addDoc(collection(db, 'studentDoubts'), {
        studentUid: user.uid,
        studentName,
        studentEmail: profile.email || user.email || '',
        classId,
        className: profile.class_name || profile.className || classId.toUpperCase(),
        subject: selectedSubject,
        question,
        referenceImageUrl,
        referenceImageName,
        facultyUid,
        status: 'pending',
        replies: [],
        createdAt: new Date().toISOString(),
      })

      setDoubtQuestion('')
      setDoubtSubject('')
      setDoubtSubmitMessage('Doubt sent to subject teacher successfully.')
      setDoubtReferenceFile(null)
      if (doubtReferencePreview) {
        URL.revokeObjectURL(doubtReferencePreview)
      }
      setDoubtReferencePreview('')
    } catch (error) {
      setDoubtSubmitError(error?.message || 'Unable to send doubt right now.')
    } finally {
      setIsSubmittingDoubt(false)
    }
  }

  const handleAskAiDoubt = async (event) => {
    event.preventDefault()

    const subject = String(aiDoubtSubject || '').trim()
    const question = String(aiDoubtQuestion || '').trim()

    if (!question) {
      return
    }

    setIsSubmittingAiDoubt(true)
    setAiDoubtThread((prev) => [
      ...prev,
      {
        role: 'student',
        text: `${subject ? `[${subject}] ` : ''}${question}`,
      },
    ])

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/doubt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          question,
        }),
      })

      const responseText = await response.text()
      let result

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`AI API returned non-JSON. Check backend at ${apiBaseUrl}.`)
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Unable to get AI response right now.')
      }

      const rawAiText = result?.data?.answer || 'No response generated.'
      const aiText = String(rawAiText)
        .replace(/\*\*/g, '')
        .replace(/^\s*[-*]\s+/gm, '• ')
        .replace(/^\s*#+\s*/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      setAiDoubtThread((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: aiText,
        },
      ])
      setAiDoubtQuestion('')
    } catch (error) {
      setAiDoubtThread((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: error?.message || 'Unable to get AI response right now.',
        },
      ])
    } finally {
      setIsSubmittingAiDoubt(false)
    }
  }

  const handleComplaintPhotoSelect = (event) => {
    setComplaintSubmitError('')
    setComplaintSubmitMessage('')

    const file = event.target.files?.[0]
    if (!file) {
      setComplaintPhotoFile(null)
      setComplaintPhotoPreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setComplaintSubmitError('Please select a valid complaint photo.')
      setComplaintPhotoFile(null)
      setComplaintPhotoPreview('')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setComplaintSubmitError('Complaint photo must be 5MB or less.')
      setComplaintPhotoFile(null)
      setComplaintPhotoPreview('')
      return
    }

    if (complaintPhotoPreview) {
      URL.revokeObjectURL(complaintPhotoPreview)
    }

    setComplaintPhotoFile(file)
    setComplaintPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmitComplaint = async (event) => {
    event.preventDefault()
    setComplaintSubmitError('')
    setComplaintSubmitMessage('')

    if (!user?.uid || !profile) {
      setComplaintSubmitError('Student session is unavailable. Please login again.')
      return
    }

    const type = String(complaintType || '').trim()
    const priority = String(complaintPriority || 'medium').trim().toLowerCase()
    const description = String(complaintDescription || '').trim()

    if (!type || !priority || !description) {
      setComplaintSubmitError('Complaint type, priority, and description are required.')
      return
    }

    setIsSubmittingComplaint(true)

    try {
      let photoUrl = ''
      let photoName = ''

      if (complaintPhotoFile) {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase is not configured for complaint photo upload.')
        }

        const bucketName = import.meta.env.VITE_SUPABASE_COMPLAINT_BUCKET || import.meta.env.VITE_SUPABASE_SELFIE_BUCKET || 'student-selfies'
        const extension = String(complaintPhotoFile.name || '').split('.').pop() || 'jpg'
        const objectPath = `complaints/${user.uid}/${Date.now()}-complaint.${extension}`
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(objectPath, complaintPhotoFile, {
            cacheControl: '3600',
            contentType: complaintPhotoFile.type || 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath)
        photoUrl = publicUrlData?.publicUrl || ''
        photoName = complaintPhotoFile.name || ''
      }

      const nowIso = new Date().toISOString()
      await addDoc(collection(db, 'campusComplaints'), {
        studentUid: user.uid,
        studentName,
        studentEmail: profile.email || user.email || '',
        classId: normalizeClassValue(profile.class_id || profile.classId),
        className: profile.class_name || profile.className || 'N/A',
        complaintType: type,
        priority,
        description,
        photoUrl,
        photoName,
        status: 'pending',
        latestRemark: '',
        statusHistory: [
          {
            from: 'new',
            to: 'pending',
            remark: 'Complaint raised by student.',
            changedAt: nowIso,
            changedByUid: user.uid,
            changedByName: studentName,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      })

      setComplaintType('')
      setComplaintPriority('medium')
      setComplaintDescription('')
      setComplaintPhotoFile(null)
      if (complaintPhotoPreview) {
        URL.revokeObjectURL(complaintPhotoPreview)
      }
      setComplaintPhotoPreview('')
      setComplaintSubmitMessage('Complaint submitted successfully to campus incharge.')
    } catch (error) {
      setComplaintSubmitError(error?.message || 'Unable to submit complaint right now.')
    } finally {
      setIsSubmittingComplaint(false)
    }
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

  const handleGitHubProfileUpdate = async (event) => {
    event.preventDefault()
    setGitHubError('')
    setGitHubMessage('')

    if (!user?.uid) {
      setGitHubError('Unable to identify student session.')
      return
    }

    if (!gitHubUrl.trim()) {
      setGitHubError('Please enter a GitHub profile URL or username.')
      return
    }

    setIsUpdatingGitHub(true)

    try {
      const result = await apiRequest('/api/auth/update-github-profile', {
        method: 'POST',
        body: JSON.stringify({
          gitHubUrl: gitHubUrl.trim(),
        }),
      })

      setGitHubScore(result.data.score)
      setProfile((prev) => ({
        ...(prev || {}),
        gitHubProfile: result.data,
        gitHubScore: result.data.score,
      }))
      setGitHubMessage(`GitHub profile updated! Score: ⭐ ${result.data.score} / 5`)
    } catch (error) {
      setGitHubError(error.message || 'Unable to update GitHub profile. Please check the URL and try again.')
    } finally {
      setIsUpdatingGitHub(false)
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
    { label: 'GitHub Score', value: gitHubScore ? `⭐ ${gitHubScore} / 5` : 'Not set' },
    { label: 'Fee Status', value: feeStatus },
    { label: 'Pending Assignments', value: isLoading ? 'Loading...' : pendingAssignmentsCount },
  ]

  if (showPlacementTraining) {
    return <PlacementTraining onBack={handlePlacementTrainingBack} />
  }

  return (
    <div className="auth-card dashboard-card student-dashboard-shell">
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
          {!activeModule && activeRoutePath !== TIMETABLE_ROUTE_PATH && (
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

          {(activeModule || activeRoutePath === TIMETABLE_ROUTE_PATH) && (
            <section className="admin-panel-card academic-open-panel" aria-label="Selected module page">
              <div className="erp-modules-head">
                <h3>{activeRoutePath === TIMETABLE_ROUTE_PATH ? 'Timetable Section' : activeModule.name}</h3>
                <button type="button" className="secondary-btn" onClick={goToDashboardRoute}>
                  Back to Dashboard
                </button>
              </div>

              {activeRoutePath === TIMETABLE_ROUTE_PATH ? (
                <>
                  <p className="login-hint">Full timetable for your assigned division</p>
                  <div className="users-table-wrap">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Subject</th>
                          <th>Time Slot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todaySchedule.length === 0 ? (
                          <tr>
                            <td colSpan="3">No timetable uploaded for your division yet.</td>
                          </tr>
                        ) : (
                          todaySchedule.map((item, index) => (
                            <tr key={`${item.day}-${item.time}-${item.subject}-${index}`}>
                              <td>{item.day || 'N/A'}</td>
                              <td>{item.subject || 'N/A'}</td>
                              <td>{item.time || 'N/A'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : activeModule.type === 'academic' ? (
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
                        {subjectAttendance.length === 0 ? (
                          <li>No attendance records available yet.</li>
                        ) : (
                          subjectAttendance.map((item) => (
                            <li key={item.subject}>
                              {item.subject}: {item.percentage} ({item.present}/{item.total})
                            </li>
                          ))
                        )}
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
                      <div className="users-table-wrap">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Day</th>
                              <th>Subject</th>
                              <th>Time Slot</th>
                            </tr>
                          </thead>
                          <tbody>
                            {todaySchedule.length === 0 ? (
                              <tr>
                                <td colSpan="3">No timetable uploaded for your division yet.</td>
                              </tr>
                            ) : (
                              todaySchedule.slice(0, 5).map((item, index) => (
                                <tr key={`${item.day}-${item.time}-${item.subject}-${index}`}>
                                  <td>{item.day || 'N/A'}</td>
                                  <td>{item.subject || 'N/A'}</td>
                                  <td>{item.time || 'N/A'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <button type="button" className="secondary-btn" onClick={goToTimetableRoute}>
                        Open Full Timetable
                      </button>
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

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">SK</span>
                        <h4>Skills and CGPI</h4>
                      </div>
                      <p className="module-main-value">This is your CGPI: {studentCgpi.toFixed(2)}</p>
                      <p className="login-hint">Default CGPI is 8.00 if results are not available.</p>
                      <ul className="module-list">
                        {studentSkills.length === 0 ? (
                          <li>No skills added yet.</li>
                        ) : (
                          studentSkills.map((skill) => <li key={skill}>{skill}</li>)
                        )}
                      </ul>

                      <div className="inline-actions" style={{ marginTop: 10 }}>
                        <input
                          type="text"
                          value={skillDraft}
                          onChange={(event) => setSkillDraft(event.target.value)}
                          placeholder="Add skills (comma separated)"
                        />
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={handleSaveSkillSet}
                          disabled={isSavingSkills}
                        >
                          {isSavingSkills ? 'Saving...' : 'Save Skills'}
                        </button>
                      </div>

                      {skillError && <p className="field-error">{skillError}</p>}
                      {skillMessage && <p className="field-success">{skillMessage}</p>}
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
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">CP</span>
                        <h4>Campus Complaints</h4>
                      </div>

                      <form className="auth-form" onSubmit={handleSubmitComplaint}>
                        <label htmlFor="complaint-type">Complaint Type</label>
                        <select
                          id="complaint-type"
                          value={complaintType}
                          onChange={(event) => setComplaintType(event.target.value)}
                          required
                        >
                          <option value="">Select type</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Water">Water</option>
                          <option value="Internet">Internet</option>
                          <option value="Cleanliness">Cleanliness</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Security">Security</option>
                          <option value="Other">Other</option>
                        </select>

                        <label htmlFor="complaint-priority">Set Priority</label>
                        <select
                          id="complaint-priority"
                          value={complaintPriority}
                          onChange={(event) => setComplaintPriority(event.target.value)}
                          required
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>

                        <label htmlFor="complaint-description">Description</label>
                        <textarea
                          id="complaint-description"
                          rows={4}
                          value={complaintDescription}
                          onChange={(event) => setComplaintDescription(event.target.value)}
                          placeholder="Describe the complaint in detail"
                          required
                        />

                        <label htmlFor="complaint-photo">Upload Photo (Optional)</label>
                        <input
                          id="complaint-photo"
                          type="file"
                          accept="image/*"
                          onChange={handleComplaintPhotoSelect}
                        />

                        {complaintPhotoPreview && (
                          <div className="new-selfie-preview-wrap">
                            <span>Selected complaint image:</span>
                            <img src={complaintPhotoPreview} alt="Complaint preview" className="selfie-preview" />
                          </div>
                        )}

                        {complaintSubmitError && <p className="field-error">{complaintSubmitError}</p>}
                        {complaintSubmitMessage && <p className="field-success">{complaintSubmitMessage}</p>}

                        <button type="submit" className="submit-btn" disabled={isSubmittingComplaint}>
                          {isSubmittingComplaint ? 'Submitting...' : 'Submit Complaint'}
                        </button>
                      </form>

                      <div className="users-table-wrap" style={{ marginTop: 16 }}>
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Priority</th>
                              <th>Description</th>
                              <th>Status</th>
                              <th>Remark</th>
                              <th>Photo</th>
                              <th>Updated At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentComplaints.length === 0 ? (
                              <tr>
                                <td colSpan="7">No complaints submitted yet.</td>
                              </tr>
                            ) : (
                              studentComplaints.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.complaintType || 'N/A'}</td>
                                  <td>{String(item.priority || 'medium').toUpperCase()}</td>
                                  <td>{item.description || 'N/A'}</td>
                                  <td>{formatComplaintStatus(item.status)}</td>
                                  <td>{item.latestRemark || 'N/A'}</td>
                                  <td>
                                    {item.photoUrl ? (
                                      <a href={item.photoUrl} target="_blank" rel="noreferrer">View Photo</a>
                                    ) : 'N/A'}
                                  </td>
                                  <td>{formatCollabDate(item.updatedAt || item.createdAt)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'lost-found' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">LF</span>
                        <h4>Lost and Found</h4>
                      </div>

                      <form className="auth-form" onSubmit={handleSubmitLostItem}>
                        <label htmlFor="lost-item-name">Item Name</label>
                        <input
                          id="lost-item-name"
                          type="text"
                          value={lostItemName}
                          onChange={(event) => setLostItemName(event.target.value)}
                          placeholder="ID Card, Phone, Wallet, etc"
                          required
                        />

                        <label htmlFor="lost-item-category">Category</label>
                        <select
                          id="lost-item-category"
                          value={lostItemCategory}
                          onChange={(event) => setLostItemCategory(event.target.value)}
                          required
                        >
                          <option value="">Select category</option>
                          <option value="ID Card">ID Card</option>
                          <option value="Mobile Phone">Mobile Phone</option>
                          <option value="Wallet">Wallet</option>
                          <option value="Documents">Documents</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Other">Other</option>
                        </select>

                        <label htmlFor="lost-item-description">Description</label>
                        <textarea
                          id="lost-item-description"
                          rows={4}
                          value={lostItemDescription}
                          onChange={(event) => setLostItemDescription(event.target.value)}
                          placeholder="Add color, brand, location, or any identifying details"
                          required
                        />

                        <label htmlFor="lost-item-photo">Upload Photo (Optional)</label>
                        <input
                          id="lost-item-photo"
                          type="file"
                          accept="image/*"
                          onChange={handleLostItemPhotoSelect}
                        />

                        {lostItemPhotoPreview && (
                          <div className="new-selfie-preview-wrap">
                            <span>Selected item image:</span>
                            <img src={lostItemPhotoPreview} alt="Lost item preview" className="selfie-preview" />
                          </div>
                        )}

                        {lostFoundError && <p className="field-error">{lostFoundError}</p>}
                        {lostFoundMessage && <p className="field-success">{lostFoundMessage}</p>}

                        <button type="submit" className="submit-btn" disabled={isSubmittingLostItem}>
                          {isSubmittingLostItem ? 'Posting...' : 'Post Lost Item'}
                        </button>
                      </form>

                      <div className="users-table-wrap" style={{ marginTop: 16 }}>
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Description</th>
                              <th>Owner Contact</th>
                              <th>Status</th>
                              <th>Photo</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {publicLostItems.length === 0 ? (
                              <tr>
                                <td colSpan="6">No lost items posted yet.</td>
                              </tr>
                            ) : (
                              publicLostItems.map((item) => (
                                <tr key={item.id}>
                                  <td>
                                    <strong>{item.itemName || 'N/A'}</strong>
                                    <div>{item.category || 'N/A'}</div>
                                  </td>
                                  <td>{item.description || 'N/A'}</td>
                                  <td>
                                    <div>{item.ownerName || 'N/A'}</div>
                                    <div>{item.ownerPhone || 'N/A'}</div>
                                    <div>{item.ownerEmail || 'N/A'}</div>
                                  </td>
                                  <td>{formatLostFoundStatus(item.status)}</td>
                                  <td>
                                    {item.photoUrl ? (
                                      <a href={item.photoUrl} target="_blank" rel="noreferrer">View Photo</a>
                                    ) : 'N/A'}
                                  </td>
                                  <td>
                                    {item.ownerUid === user?.uid ? (
                                      String(item.status || '').toLowerCase() === 'claimed' ? (
                                        <button
                                          type="button"
                                          className="secondary-btn"
                                          disabled={isUpdatingLostFound}
                                          onClick={() => handleMarkItemReturned(item)}
                                        >
                                          Mark Returned
                                        </button>
                                      ) : (
                                        <span className="status-pill ok">Your Post</span>
                                      )
                                    ) : (
                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={isUpdatingLostFound || String(item.status || '').toLowerCase() === 'claimed'}
                                        onClick={() => handleMarkItemFound(item)}
                                      >
                                        {String(item.status || '').toLowerCase() === 'claimed' ? 'Already Found' : 'I Found This'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">UP</span>
                        <h4>My Lost Item Updates</h4>
                      </div>

                      <div className="users-table-wrap">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Status</th>
                              <th>Finder Contact</th>
                              <th>Finder Note</th>
                              <th>Updated At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myLostItemUpdates.length === 0 ? (
                              <tr>
                                <td colSpan="5">No updates yet on your lost posts.</td>
                              </tr>
                            ) : (
                              myLostItemUpdates.map((item) => (
                                <tr key={`my-${item.id}`}>
                                  <td>{item.itemName || 'N/A'}</td>
                                  <td>{formatLostFoundStatus(item.status)}</td>
                                  <td>
                                    {item.finderUid ? (
                                      <>
                                        <div>{item.finderName || 'N/A'}</div>
                                        <div>{item.finderPhone || 'N/A'}</div>
                                        <div>{item.finderEmail || 'N/A'}</div>
                                      </>
                                    ) : 'No finder yet'}
                                  </td>
                                  <td>{item.finderNote || 'N/A'}</td>
                                  <td>{formatCollabDate(item.updatedAt || item.createdAt)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'exam' ? (
                <>
                  <div className="module-detail-grid">
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">EX</span>
                        <h4>Exam Form Submission</h4>
                      </div>

                      <ul className="module-list">
                        <li>Form Window: {examConfig.formOpen ? 'Open' : 'Closed'}</li>
                        <li>Deadline: {examConfig.formDeadline || 'Not Announced'}</li>
                        <li>Attendance: {attendancePercentage.toFixed(2)}%</li>
                        <li>Fee Status: {feeStatus}</li>
                        <li>System Eligibility: {examSystemEligibility ? 'Eligible' : 'Blocked'}</li>
                        <li>Coordinator Approval: {latestExamForm?.coordinatorEligibility || 'pending'}</li>
                      </ul>

                      <form className="auth-form" onSubmit={handleSubmitExamForm}>
                        <label htmlFor="exam-subjects">Subjects (comma separated)</label>
                        <textarea
                          id="exam-subjects"
                          rows={3}
                          value={examSelectedSubjectsInput}
                          onChange={(event) => setExamSelectedSubjectsInput(event.target.value)}
                          placeholder="Mathematics, Data Structures, Operating Systems"
                          required
                        />

                        {examFormError && <p className="field-error">{examFormError}</p>}
                        {examFormMessage && <p className="field-success">{examFormMessage}</p>}

                        <button type="submit" className="submit-btn" disabled={isSubmittingExamForm || !examConfig.formOpen}>
                          {isSubmittingExamForm ? 'Submitting...' : 'Submit Exam Form'}
                        </button>
                      </form>
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">TT</span>
                        <h4>Exam Timetable</h4>
                      </div>
                      <div className="users-table-wrap">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Date</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examTimetableRows.length === 0 ? (
                              <tr>
                                <td colSpan="3">No exam timetable available for your class yet.</td>
                              </tr>
                            ) : (
                              examTimetableRows.map((row) => (
                                <tr key={row.id}>
                                  <td>{row.subject || 'N/A'}</td>
                                  <td>{row.date || 'N/A'}</td>
                                  <td>{row.time || 'N/A'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">HT</span>
                        <h4>Hall Ticket</h4>
                      </div>
                      {latestExamHallTicket ? (
                        <>
                          <ul className="module-list">
                            <li>Exam Center: {latestExamHallTicket.examCenter || 'N/A'}</li>
                            <li>Seat Number: {latestExamHallTicket.seatNumber || 'N/A'}</li>
                            <li>Generated At: {formatCollabDate(latestExamHallTicket.generatedAt)}</li>
                          </ul>
                          <button type="button" className="submit-btn" onClick={handleDownloadHallTicketPdf}>
                            Download Hall Ticket (PDF)
                          </button>
                        </>
                      ) : (
                        <p className="login-hint">Hall ticket is not generated yet.</p>
                      )}
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">RS</span>
                        <h4>Result and Backlog Status</h4>
                      </div>

                      {!latestExamResult ? (
                        <p className="login-hint">Result is not published yet.</p>
                      ) : (
                        <>
                          <p className={`status-pill ${latestExamResult.result === 'Pass' ? 'ok' : 'danger'}`}>
                            Final Result: {latestExamResult.result || 'N/A'}
                          </p>
                          <ul className="module-list">
                            <li>Total: {Number(latestExamResult.total || 0).toFixed(2)}</li>
                            <li>Average: {Number(latestExamResult.average || 0).toFixed(2)}</li>
                            <li>
                              Backlog Subjects: {Array.isArray(latestExamResult.backlogSubjects) && latestExamResult.backlogSubjects.length > 0
                                ? latestExamResult.backlogSubjects.join(', ')
                                : 'None'}
                            </li>
                          </ul>

                          <div className="users-table-wrap">
                            <table className="users-table">
                              <thead>
                                <tr>
                                  <th>Subject</th>
                                  <th>Marks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {examSubjectsFromResult.map((row, index) => (
                                  <tr key={`${row.subject || 'subject'}-${index}`}>
                                    <td>{row.subject || 'N/A'}</td>
                                    <td>{Number(row.marks || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <p className="module-main-value" style={{ marginTop: 10 }}>
                            Performance Summary: Highest {examPerformanceSummary.maxMarks.toFixed(2)} | Lowest {examPerformanceSummary.minMarks.toFixed(2)}
                          </p>
                        </>
                      )}
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">NT</span>
                        <h4>Exam Notifications</h4>
                      </div>
                      <ul className="module-list">
                        {examNotifications.length === 0 ? (
                          <li>No exam notifications yet.</li>
                        ) : (
                          examNotifications.map((item) => (
                            <li key={item.id}>
                              <strong>{item.title || 'Notification'}</strong> - {item.message || 'N/A'} ({formatCollabDate(item.createdAt)})
                            </li>
                          ))
                        )}
                      </ul>
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">GV</span>
                        <h4>Exam Grievance</h4>
                      </div>

                      <form className="auth-form" onSubmit={handleSubmitExamGrievance}>
                        <label htmlFor="exam-grievance-subject">Subject</label>
                        <input
                          id="exam-grievance-subject"
                          type="text"
                          value={examGrievanceSubject}
                          onChange={(event) => setExamGrievanceSubject(event.target.value)}
                          placeholder="Example: Marks mismatch in Data Structures"
                          required
                        />

                        <label htmlFor="exam-grievance-description">Description</label>
                        <textarea
                          id="exam-grievance-description"
                          rows={4}
                          value={examGrievanceDescription}
                          onChange={(event) => setExamGrievanceDescription(event.target.value)}
                          placeholder="Describe your exam-related issue"
                          required
                        />

                        {examGrievanceError && <p className="field-error">{examGrievanceError}</p>}
                        {examGrievanceMessage && <p className="field-success">{examGrievanceMessage}</p>}

                        <button type="submit" className="submit-btn" disabled={isSubmittingExamGrievance}>
                          {isSubmittingExamGrievance ? 'Submitting...' : 'Submit Grievance'}
                        </button>
                      </form>

                      <div className="users-table-wrap" style={{ marginTop: 16 }}>
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Description</th>
                              <th>Status</th>
                              <th>Updated At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examGrievances.length === 0 ? (
                              <tr>
                                <td colSpan="4">No exam grievances raised yet.</td>
                              </tr>
                            ) : (
                              examGrievances.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.subject || 'N/A'}</td>
                                  <td>{item.description || 'N/A'}</td>
                                  <td>{formatPlacementStatus(item.status || 'open')}</td>
                                  <td>{formatCollabDate(item.updatedAt || item.createdAt)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
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
                        <h4>Ask Subject Doubt</h4>
                      </div>

                      <div className="admin-switch" style={{ marginTop: 0, marginBottom: 12 }}>
                        <button
                          type="button"
                          className={doubtMode === 'manual' ? 'active' : ''}
                          onClick={() => {
                            setDoubtMode('manual')
                            setIsAiChatFullscreen(false)
                          }}
                        >
                          Manual Doubt (To Faculty)
                        </button>
                        <button
                          type="button"
                          className={doubtMode === 'ai' ? 'active' : ''}
                          onClick={() => setDoubtMode('ai')}
                        >
                          AI Doubt (Gemini)
                        </button>
                      </div>

                      {doubtMode === 'manual' ? (
                        <>
                          <form className="auth-form" onSubmit={handleAskDoubt}>
                            <label htmlFor="doubt-subject">Subject</label>
                            <select
                              id="doubt-subject"
                              value={doubtSubject}
                              onChange={(event) => setDoubtSubject(event.target.value)}
                              required
                            >
                              <option value="">Select subject</option>
                              {timetableSubjectOptions.map((subject) => (
                                <option key={subject} value={subject}>{subject}</option>
                              ))}
                            </select>

                            <label htmlFor="doubt-question">Doubt</label>
                            <textarea
                              id="doubt-question"
                              rows={4}
                              value={doubtQuestion}
                              onChange={(event) => setDoubtQuestion(event.target.value)}
                              placeholder="Write your doubt in detail"
                              required
                            />

                            <label htmlFor="doubt-reference">Reference Photo (Optional)</label>
                            <input
                              id="doubt-reference"
                              type="file"
                              accept="image/*"
                              onChange={handleDoubtReferenceSelect}
                            />

                            {doubtReferencePreview && (
                              <div className="new-selfie-preview-wrap">
                                <span>Selected reference image:</span>
                                <img src={doubtReferencePreview} alt="Reference preview" className="selfie-preview" />
                              </div>
                            )}

                            {doubtSubmitError && <p className="field-error">{doubtSubmitError}</p>}
                            {doubtSubmitMessage && <p className="field-success">{doubtSubmitMessage}</p>}

                            <button type="submit" className="submit-btn" disabled={isSubmittingDoubt}>
                              {isSubmittingDoubt ? 'Sending...' : 'Send to Subject Teacher'}
                            </button>
                          </form>

                          <div className="users-table-wrap" style={{ marginTop: 16 }}>
                            <table className="users-table">
                              <thead>
                                <tr>
                                  <th>Subject</th>
                                  <th>Doubt</th>
                                  <th>Status</th>
                                  <th>Teacher Reply</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentDoubts.length === 0 ? (
                                  <tr>
                                    <td colSpan="4">No doubts submitted yet.</td>
                                  </tr>
                                ) : (
                                  studentDoubts.map((item) => {
                                    const latestReply = Array.isArray(item.replies) && item.replies.length > 0
                                      ? item.replies[item.replies.length - 1]
                                      : null

                                    return (
                                      <tr key={item.id}>
                                        <td>{item.subject || 'N/A'}</td>
                                        <td>
                                          <div>{item.question || 'N/A'}</div>
                                          {item.referenceImageUrl && (
                                            <a href={item.referenceImageUrl} target="_blank" rel="noreferrer">View Photo</a>
                                          )}
                                        </td>
                                        <td>{item.status || 'pending'}</td>
                                        <td>{latestReply?.message || 'No reply yet'}</td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className={`ai-doubt-shell ${isAiChatFullscreen ? 'fullscreen' : ''}`}>
                          <div className="ai-doubt-shell-head">
                            <p className="login-hint">Switch fullscreen for distraction-free AI chat.</p>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => setIsAiChatFullscreen((prev) => !prev)}
                            >
                              {isAiChatFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            </button>
                          </div>

                          <div className="doubt-chat-box">
                            {aiDoubtThread.map((message, index) => (
                              <p
                                key={`${message.role}-${index}`}
                                className={`chat-bubble ${message.role === 'student' ? 'student' : 'assistant'}`}
                              >
                                {message.text}
                              </p>
                            ))}
                          </div>

                          <form className="auth-form" onSubmit={handleAskAiDoubt}>
                            <label htmlFor="ai-doubt-subject">Subject (Optional)</label>
                            <select
                              id="ai-doubt-subject"
                              value={aiDoubtSubject}
                              onChange={(event) => setAiDoubtSubject(event.target.value)}
                            >
                              <option value="">General</option>
                              {timetableSubjectOptions.map((subject) => (
                                <option key={subject} value={subject}>{subject}</option>
                              ))}
                            </select>

                            <label htmlFor="ai-doubt-question">Ask AI Doubt</label>
                            <textarea
                              id="ai-doubt-question"
                              rows={isAiChatFullscreen ? 6 : 4}
                              value={aiDoubtQuestion}
                              onChange={(event) => setAiDoubtQuestion(event.target.value)}
                              placeholder="Ask your question to Gemini"
                              required
                            />

                            <button type="submit" className="submit-btn" disabled={isSubmittingAiDoubt}>
                              {isSubmittingAiDoubt ? 'Thinking...' : 'Ask AI'}
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  </div>
                </>
              ) : activeModule.type === 'placement' ? (
                <>
                  <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="submit-btn"
                      onClick={() => setShowPlacementTraining(true)}
                    >
                      Go to Placement Training
                    </button>
                  </div>
                  <div className="module-detail-grid">
                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">PL</span>
                        <h4>Company Drive List</h4>
                      </div>

                      <div className="users-table-wrap">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Company</th>
                              <th>Role</th>
                              <th>CTC</th>
                              <th>Eligibility</th>
                              <th>Last Date</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {placementCompanies.length === 0 ? (
                              <tr>
                                <td colSpan="6">No company drives published yet.</td>
                              </tr>
                            ) : (
                              placementCompanies.map((company) => {
                                const eligibility = getEligibilityForCompany(company)
                                const existingApplication = placementApplications.find((item) => item.companyId === company.id)

                                return (
                                  <tr key={company.id}>
                                    <td>{company.companyName || 'N/A'}</td>
                                    <td>{company.role || 'N/A'}</td>
                                    <td>{company.packageCtc || 'N/A'}</td>
                                    <td>
                                      <span className={`status-pill ${eligibility.eligible ? 'ok' : 'danger'}`}>
                                        {eligibility.eligible ? 'Eligible' : 'Not Eligible'}
                                      </span>
                                      <div className="login-hint">{eligibility.reason}</div>
                                    </td>
                                    <td>{company.lastDate || 'N/A'}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={!eligibility.eligible || Boolean(existingApplication)}
                                        onClick={() => {
                                          setSelectedCompanyId(company.id)
                                          setPlacementApplyError('')
                                          setPlacementApplyMessage('')
                                        }}
                                      >
                                        {existingApplication ? 'Applied' : 'Apply Now'}
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {selectedCompanyId && (
                        <form
                          className="auth-form"
                          style={{ marginTop: 14 }}
                          onSubmit={(event) => {
                            const selectedCompany = placementCompanies.find((item) => item.id === selectedCompanyId)
                            handleSubmitPlacementApplication(event, selectedCompany)
                          }}
                        >
                          <h4>Apply Form</h4>

                          <label htmlFor="placement-apply-name">Name</label>
                          <input id="placement-apply-name" value={studentName} readOnly />

                          <label htmlFor="placement-apply-enrollment">Enrollment Number</label>
                          <input id="placement-apply-enrollment" value={enrollmentNumber} readOnly />

                          <label htmlFor="placement-apply-resume">Resume Upload</label>
                          <input
                            id="placement-apply-resume"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(event) => setApplicationResumeFile(event.target.files?.[0] || null)}
                          />

                          <label htmlFor="placement-apply-skills">Skills</label>
                          <textarea
                            id="placement-apply-skills"
                            rows={3}
                            value={applicationSkillsInput}
                            onChange={(event) => setApplicationSkillsInput(event.target.value)}
                            placeholder="Comma separated skills"
                            required
                          />

                          <label htmlFor="placement-apply-cgpi">CGPI</label>
                          <input
                            id="placement-apply-cgpi"
                            type="number"
                            min="0"
                            max="10"
                            step="0.01"
                            value={applicationCgpi}
                            onChange={(event) => setApplicationCgpi(event.target.value)}
                            required
                          />

                          {placementApplyError && <p className="field-error">{placementApplyError}</p>}
                          {placementApplyMessage && <p className="field-success">{placementApplyMessage}</p>}

                          <div className="inline-actions">
                            <button type="submit" className="submit-btn" disabled={isSubmittingPlacementApply}>
                              {isSubmittingPlacementApply ? 'Applying...' : 'Submit Application'}
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => setSelectedCompanyId('')}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">ST</span>
                        <h4>Application Status Tracker</h4>
                      </div>
                      <div className="users-table-wrap">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Company</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Updated At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {placementApplications.length === 0 ? (
                              <tr>
                                <td colSpan="4">No applications submitted yet.</td>
                              </tr>
                            ) : (
                              placementApplications.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.companyName || 'N/A'}</td>
                                  <td>{item.companyRole || 'N/A'}</td>
                                  <td>{formatPlacementStatus(item.status)}</td>
                                  <td>{formatCollabDate(item.updatedAt || item.createdAt)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">RS</span>
                        <h4>Results Section</h4>
                      </div>
                      <ul className="module-list">
                        {placementApplications.filter((item) => item.status === 'selected' || item.status === 'rejected').length === 0 ? (
                          <li>No final results available yet.</li>
                        ) : (
                          placementApplications
                            .filter((item) => item.status === 'selected' || item.status === 'rejected')
                            .map((item) => (
                              <li key={`result-${item.id}`}>
                                {item.companyName || 'Company'}: {item.status === 'selected' ? 'Selected' : 'Rejected'}
                              </li>
                            ))
                        )}
                      </ul>
                    </article>

                    <article className="module-detail-card">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">RD</span>
                        <h4>Placement Readiness Score</h4>
                      </div>
                      <p className="module-main-value">Your Placement Score: {placementReadinessScore}%</p>
                      <ul className="module-list">
                        <li>CGPI Contribution: {(studentCgpi * 10).toFixed(2)}</li>
                        <li>Attendance Contribution: {attendancePercentage.toFixed(2)}</li>
                        <li>Skills Contribution: {(studentSkills.length * 5).toFixed(2)}</li>
                      </ul>
                    </article>

                    <article className="module-detail-card module-detail-card-wide">
                      <div className="module-detail-head">
                        <span className="module-icon-chip">GV</span>
                        <h4>Placement Grievance</h4>
                      </div>

                      <form className="auth-form" onSubmit={handleSubmitPlacementGrievance}>
                        <label htmlFor="placement-grievance-subject">Subject</label>
                        <input
                          id="placement-grievance-subject"
                          type="text"
                          value={placementGrievanceSubject}
                          onChange={(event) => setPlacementGrievanceSubject(event.target.value)}
                          placeholder="Example: My result not updated"
                          required
                        />

                        <label htmlFor="placement-grievance-description">Description</label>
                        <textarea
                          id="placement-grievance-description"
                          rows={4}
                          value={placementGrievanceDescription}
                          onChange={(event) => setPlacementGrievanceDescription(event.target.value)}
                          placeholder="Describe your issue"
                          required
                        />

                        {placementGrievanceError && <p className="field-error">{placementGrievanceError}</p>}
                        {placementGrievanceMessage && <p className="field-success">{placementGrievanceMessage}</p>}

                        <button type="submit" className="submit-btn" disabled={isSubmittingPlacementGrievance}>
                          {isSubmittingPlacementGrievance ? 'Submitting...' : 'Submit Grievance'}
                        </button>
                      </form>

                      <div className="users-table-wrap" style={{ marginTop: 16 }}>
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Description</th>
                              <th>Status</th>
                              <th>Updated At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {placementGrievances.length === 0 ? (
                              <tr>
                                <td colSpan="4">No grievances raised yet.</td>
                              </tr>
                            ) : (
                              placementGrievances.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.subject || 'N/A'}</td>
                                  <td>{item.description || 'N/A'}</td>
                                  <td>{formatPlacementStatus(item.status || 'open')}</td>
                                  <td>{formatCollabDate(item.updatedAt || item.createdAt)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
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

      {activeView === 'attendance' && <StudentAttendanceOverview user={user} attendanceRows={realtimeAttendanceRows} />}

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

          <form className="auth-form request-form" onSubmit={handleGitHubProfileUpdate}>
            <h4>GitHub Profile (For Placement)</h4>
            <p className="login-hint">
              Connect your GitHub profile to showcase your coding skills and contributions. Your GitHub score will be visible to placement coordinators.
            </p>

            {profile?.gitHubProfile && (
              <div className="existing-github-wrap">
                <span>Current GitHub Profile:</span>
                <div className="github-profile-info">
                  <p><strong>Username:</strong> <a href={profile.gitHubProfile.url} target="_blank" rel="noopener noreferrer">{profile.gitHubProfile.username}</a></p>
                  <p><strong>Score:</strong> <span style={{ 
                    background: `linear-gradient(135deg, ${getScoreColor(profile.gitHubProfile.score)[0]} 0%, ${getScoreColor(profile.gitHubProfile.score)[1]} 100%)`,
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}>⭐ {profile.gitHubProfile.score} / 5</span></p>
                  <p><strong>Repositories:</strong> {profile.gitHubProfile.repoCount}</p>
                </div>
              </div>
            )}

            <label htmlFor="github-url">GitHub Profile URL or Username</label>
            <input
              id="github-url"
              type="text"
              value={gitHubUrl}
              onChange={(event) => setGitHubUrl(event.target.value)}
              placeholder="e.g., https://github.com/username or just: username"
            />

            {gitHubError && (
              <p className="field-error" role="alert">
                {gitHubError}
              </p>
            )}

            {gitHubMessage && (
              <p className="field-success" role="status">
                {gitHubMessage}
              </p>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={isUpdatingGitHub || !gitHubUrl.trim()}
            >
              {isUpdatingGitHub ? 'Updating GitHub Profile...' : 'Update GitHub Profile'}
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
