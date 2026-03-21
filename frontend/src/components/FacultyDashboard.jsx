import { useEffect, useMemo, useState } from 'react'

import { apiRequest } from '../lib/api'
import QRCodeGenerator from './QRCodeGenerator'
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TIME_SLOTS = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00']
const DEFAULT_CSE_SUBJECTS = [
  'Data Structures',
  'Algorithms',
  'Database Management Systems',
  'Operating Systems',
  'Computer Networks',
  'Object Oriented Programming',
  'Software Engineering',
  'Theory of Computation',
  'Compiler Design',
  'Artificial Intelligence',
  'Machine Learning',
  'Cloud Computing',
  'Cyber Security',
  'Web Technology',
]

function FacultyDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard')
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [faculties, setFaculties] = useState([])
  const [assignments, setAssignments] = useState([])
  const [timetableByClass, setTimetableByClass] = useState({})
  const [classTeacherAssignments, setClassTeacherAssignments] = useState([])
  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState('')
  const [timetableMap, setTimetableMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDescription, setAssignmentDescription] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignmentClassId, setAssignmentClassId] = useState('')
  const [assignmentSubject, setAssignmentSubject] = useState('')

  useEffect(() => {
    const loadFacultyData = async () => {
      if (!user?.uid) {
        setLoading(false)
        setErrorMessage('Faculty session is unavailable.')
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await apiRequest('/api/faculty/dashboard')
        const payload = response.data || {}

        const loadedClasses = payload.classes || []
        setClasses(loadedClasses)
        setTimetableByClass(payload.timetableByClass || {})
        setStudents(payload.students || [])
        setFaculties(payload.faculties || [])
        setAssignments(payload.assignments || [])
        setClassTeacherAssignments(payload.classTeacherAssignments || [])

        if (!selectedClassForTimetable && loadedClasses.length > 0) {
          setSelectedClassForTimetable(loadedClasses[0].id)
        }
      } catch (error) {
        setErrorMessage(error?.message || 'Unable to load faculty dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    loadFacultyData()
  }, [user?.uid])

  useEffect(() => {
    const loadTimetable = async () => {
      if (!selectedClassForTimetable) {
        setTimetableMap({})
        return
      }

      try {
        const response = await apiRequest(`/api/faculty/timetable?classId=${encodeURIComponent(selectedClassForTimetable)}`)
        const rows = response.data || []
        const nextMap = {}
        rows.forEach((row) => {
          const key = `${row.day}_${row.time_slot}`
          nextMap[key] = {
            id: row.id,
            day: row.day,
            timeSlot: row.time_slot,
            subject: row.subject || '',
            facultyId: row.faculty_id || '',
          }
        })
        setTimetableMap(nextMap)
      } catch (error) {
        setErrorMessage(error?.message || 'Unable to load timetable.')
      }
    }

    loadTimetable()
  }, [selectedClassForTimetable])

  const classMap = useMemo(() => {
    const map = new Map()
    classes.forEach((row) => map.set(row.id, row))
    return map
  }, [classes])

  const classTeacherClassIds = useMemo(
    () => new Set(classTeacherAssignments.map((item) => item.classId || item.class_id || item.id)),
    [classTeacherAssignments],
  )
  const isAssignedClassTeacher = classTeacherClassIds.size > 0

  const totalClasses = classes.length
  const totalStudents = students.length
  const upcomingClasses = classes
    .filter((row) => row.schedule || (timetableByClass[row.id] || []).length > 0)
    .slice(0, 5)

  const selectedClass = classes.find((row) => row.id === selectedClassForTimetable)
  const canEditTimetable = selectedClass ? classTeacherClassIds.has(selectedClass.id) : false

  const classTeacherEntry = classTeacherAssignments[0] || null
  const classTeacherClass = classTeacherEntry
    ? classMap.get(classTeacherEntry.classId || classTeacherEntry.class_id || classTeacherEntry.id)
    : null
  const classTeacherStudents = classTeacherClass
    ? students.filter((item) => (item.class_id || item.classId) === classTeacherClass.id)
    : []

  const subjectOptions = Array.from(
    new Set([
      ...DEFAULT_CSE_SUBJECTS,
      ...classes.map((row) => row.subject).filter(Boolean),
    ]),
  )

  const getClassScheduleText = (classRow) => {
    if (classRow?.schedule) {
      return classRow.schedule
    }

    const rows = timetableByClass[classRow.id] || []
    if (!rows.length) {
      return 'N/A'
    }

    const slots = rows
      .map((item) => `${item.day} ${item.time_slot}`.trim())
      .filter(Boolean)

    return slots.length ? slots.join(', ') : 'N/A'
  }

  const getClassSubjectText = (classRow) => {
    if (classRow?.subject) {
      return classRow.subject
    }

    const rows = timetableByClass[classRow.id] || []
    const subjects = Array.from(new Set(rows.map((item) => item.subject).filter(Boolean)))
    return subjects.length ? subjects.join(', ') : 'N/A'
  }

  const myClassRows = useMemo(() => {
    const rows = []

    classes.forEach((classRow) => {
      const slots = timetableByClass[classRow.id] || []

      if (!slots.length) {
        rows.push({
          id: `${classRow.id}_default`,
          classId: classRow.id,
          className: classRow.class_name || classRow.className || classRow.id,
          subject: getClassSubjectText(classRow),
          schedule: getClassScheduleText(classRow),
        })
        return
      }

      slots.forEach((slot, index) => {
        rows.push({
          id: `${classRow.id}_${slot.day}_${slot.time_slot}_${index}`,
          classId: classRow.id,
          className: classRow.class_name || classRow.className || classRow.id,
          subject: slot.subject || getClassSubjectText(classRow),
          schedule: `${slot.day || ''} ${slot.time_slot || ''}`.trim() || 'N/A',
        })
      })
    })

    return rows
  }, [classes, timetableByClass])

  const assignmentSubjectOptions = useMemo(() => {
    if (!assignmentClassId) {
      return []
    }

    const rows = timetableByClass[assignmentClassId] || []
    const fromTimetable = Array.from(new Set(rows.map((item) => item.subject).filter(Boolean)))

    if (fromTimetable.length > 0) {
      return fromTimetable
    }

    const selectedClassRow = classes.find((item) => item.id === assignmentClassId)
    return selectedClassRow?.subject ? [selectedClassRow.subject] : []
  }, [assignmentClassId, classes, timetableByClass])

  const updateTimetableCell = (day, timeSlot, field, value) => {
    const key = `${day}_${timeSlot}`
    setTimetableMap((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { day, timeSlot, subject: '', facultyId: '' }),
        [field]: value,
      },
    }))
  }

  const handleSaveTimetable = async () => {
    if (!selectedClass) {
      setErrorMessage('Select a class to save timetable.')
      return
    }

    if (!canEditTimetable) {
      setErrorMessage('Only assigned class teacher can update timetable.')
      return
    }

    setErrorMessage('')

    try {
      const entries = []

      DAYS.forEach((day) => {
        TIME_SLOTS.forEach((slot) => {
          const key = `${day}_${slot}`
          const row = timetableMap[key] || {}

          if (!row.subject && !row.facultyId) {
            return
          }

          entries.push({
            day,
            time_slot: slot,
            subject: row.subject || '',
            faculty_id: row.facultyId || user.uid,
          })
        })
      })

      await apiRequest('/api/faculty/timetable', {
        method: 'PUT',
        body: JSON.stringify({
          classId: selectedClass.id,
          entries,
        }),
      })

      setSuccessMessage('Timetable saved successfully.')
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to save timetable.')
    }
  }

  const handleCreateAssignment = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const nextTitle = assignmentTitle.trim()
    const nextDescription = assignmentDescription.trim()
    const nextDeadline = assignmentDeadline.trim()

    const nextSubject = assignmentSubject.trim()

    if (!nextTitle || !nextDescription || !nextDeadline || !assignmentClassId || !nextSubject) {
      setErrorMessage('Title, description, deadline, class and subject are required.')
      return
    }

    try {
      const payload = {
        title: nextTitle,
        description: nextDescription,
        deadline: nextDeadline,
        class_id: assignmentClassId,
        subject: nextSubject,
      }

      const response = await apiRequest('/api/faculty/assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setAssignments((prev) => [response.data, ...prev])

      setAssignmentTitle('')
      setAssignmentDescription('')
      setAssignmentDeadline('')
      setAssignmentClassId('')
      setAssignmentSubject('')
      setSuccessMessage('Assignment created.')
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to create assignment.')
    }
  }

  const sideItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'classes', label: 'My Classes' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'students', label: 'Students' },
  ]

  if (isAssignedClassTeacher) {
    sideItems.splice(2, 0, { key: 'classTeacher', label: 'Class Teacher' })

    sideItems.splice(3, 0, { key: 'timetable', label: 'Timetable' })
    sideItems.splice(4, 0, { key: 'qrcode', label: 'Attendance QR' })
  }
  useEffect(() => {
    if (!isAssignedClassTeacher && (activePage === 'classTeacher' || activePage === 'timetable')) {
      setActivePage('dashboard')
    }
  }, [isAssignedClassTeacher, activePage])

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h3>Faculty Portal</h3>
        {sideItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activePage === item.key ? 'active' : ''}
            onClick={() => setActivePage(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <section className="admin-main">
        <div className="admin-topbar">
          <h2>Faculty Dashboard</h2>
          <p>{user?.name}</p>
        </div>

        {errorMessage && <p className="field-error">{errorMessage}</p>}
        {successMessage && <p className="field-success">{successMessage}</p>}

        {loading && <p className="dashboard-welcome">Loading faculty data...</p>}

        {!loading && activePage === 'dashboard' && (
          <div className="dashboard-grid">
            <article>
              <h3>Total Classes</h3>
              <p>{totalClasses}</p>
            </article>
            <article>
              <h3>Total Students</h3>
              <p>{totalStudents}</p>
            </article>
            <article>
              <h3>Upcoming Classes</h3>
              <p>{upcomingClasses.length}</p>
            </article>
            <article>
              <h3>Faculty ID</h3>
              <p>{user?.id}</p>
            </article>
          </div>
        )}

        {!loading && activePage === 'classes' && (
          <div className="admin-panel-card">
            <h3>My Classes</h3>
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Class Name</th>
                    <th>Subject</th>
                    <th>Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan="3">No classes assigned.</td>
                    </tr>
                  ) : (
                    myClassRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.className}</td>
                        <td>{row.subject}</td>
                        <td>{row.schedule}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && isAssignedClassTeacher && activePage === 'classTeacher' && (
          <div className="admin-panel-card">
            <h3>Class Teacher Section</h3>
            {!classTeacherClass ? (
              <p className="dashboard-welcome">You are not assigned as Class Teacher.</p>
            ) : (
              <>
                <p className="dashboard-welcome">
                  Class: {classTeacherClass.class_name || classTeacherClass.className || classTeacherClass.id}
                </p>
                <p className="dashboard-welcome">
                  Department: {classTeacherClass.department || 'N/A'} | Total Students:{' '}
                  {classTeacherStudents.length}
                </p>
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Enrollment Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classTeacherStudents.length === 0 ? (
                        <tr>
                          <td colSpan="2">No students in this class.</td>
                        </tr>
                      ) : (
                        classTeacherStudents.map((row) => (
                          <tr key={row.id || row.uid}>
                            <td>{row.name || 'N/A'}</td>
                            <td>{row.enrollment_number || row.enrollmentNumber || row.id || 'N/A'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && activePage === 'assignments' && (
          <div className="admin-panel-card">
            <h3>Assignments</h3>
            <form className="auth-form" onSubmit={handleCreateAssignment}>
              <label htmlFor="assignment-title">Title</label>
              <input
                id="assignment-title"
                type="text"
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.target.value)}
                required
              />

              <label htmlFor="assignment-description">Description</label>
              <input
                id="assignment-description"
                type="text"
                value={assignmentDescription}
                onChange={(event) => setAssignmentDescription(event.target.value)}
                required
              />

              <label htmlFor="assignment-deadline">Deadline</label>
              <input
                id="assignment-deadline"
                type="datetime-local"
                value={assignmentDeadline}
                onChange={(event) => setAssignmentDeadline(event.target.value)}
                required
              />

              <label htmlFor="assignment-class">Class</label>
              <select
                id="assignment-class"
                value={assignmentClassId}
                onChange={(event) => {
                  setAssignmentClassId(event.target.value)
                  setAssignmentSubject('')
                }}
                required
              >
                <option value="">Select class</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.class_name || row.className || row.id}
                  </option>
                ))}
              </select>

              <label htmlFor="assignment-subject">Subject</label>
              <select
                id="assignment-subject"
                value={assignmentSubject}
                onChange={(event) => setAssignmentSubject(event.target.value)}
                required
              >
                <option value="">Select subject</option>
                {assignmentSubjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>

              <button type="submit" className="submit-btn">
                Create Assignment
              </button>
            </form>

            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="4">No assignments created yet.</td>
                    </tr>
                  ) : (
                    assignments.map((row) => (
                      <tr key={row.id}>
                        <td>{row.title}</td>
                        <td>{row.subject || 'N/A'}</td>
                        <td>{classMap.get(row.class_id)?.class_name || row.class_id}</td>
                        <td>{row.deadline}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activePage === 'students' && (
          <div className="admin-panel-card">
            <h3>Students</h3>
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Enrollment Number</th>
                    <th>Class</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="4">No students mapped to your classes.</td>
                    </tr>
                  ) : (
                    students.map((row) => (
                      <tr key={row.id || row.uid}>
                        <td>{row.name || 'N/A'}</td>
                        <td>{row.enrollment_number || row.enrollmentNumber || row.id || 'N/A'}</td>
                        <td>{classMap.get(row.class_id || row.classId)?.class_name || row.class_id || 'N/A'}</td>
                        <td>{row.department || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && isAssignedClassTeacher && activePage === 'timetable' && (
          <div className="admin-panel-card">
            <h3>Timetable</h3>
            <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="timetable-class">Select Class</label>
              <select
                id="timetable-class"
                value={selectedClassForTimetable}
                onChange={(event) => setSelectedClassForTimetable(event.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.class_name || row.className || row.id}
                  </option>
                ))}
              </select>
            </form>

            <p className="dashboard-welcome">
              {canEditTimetable
                ? 'You are class teacher for this class. Timetable is editable.'
                : 'Read-only timetable view. Your lectures are highlighted by your faculty ID.'}
            </p>

            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    {DAYS.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td>{slot}</td>
                      {DAYS.map((day) => {
                        const key = `${day}_${slot}`
                        const row = timetableMap[key] || { subject: '', facultyId: '' }
                        const isOwnLecture = row.facultyId === user.uid

                        if (!canEditTimetable) {
                          return (
                            <td key={key} style={isOwnLecture ? { background: 'rgba(15, 118, 110, 0.12)' } : undefined}>
                              <div>{row.subject || '-'}</div>
                              <small>{row.facultyId ? `Faculty: ${row.facultyId}` : ''}</small>
                            </td>
                          )
                        }

                        return (
                          <td key={key}>
                            <select
                              value={row.subject || ''}
                              onChange={(event) =>
                                updateTimetableCell(day, slot, 'subject', event.target.value)
                              }
                            >
                              <option value="">Subject</option>
                              {subjectOptions.map((subject) => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.facultyId || ''}
                              onChange={(event) =>
                                updateTimetableCell(day, slot, 'facultyId', event.target.value)
                              }
                            >
                              <option value="">Subject Teacher</option>
                              {faculties.map((faculty) => (
                                <option key={faculty.uid || faculty.id} value={faculty.uid || faculty.id}>
                                  {faculty.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEditTimetable && (
              <div className="table-actions" style={{ marginTop: 12 }}>
                <button type="button" onClick={handleSaveTimetable}>
                  Save Timetable
                </button>
                <button type="button" onClick={handleSaveTimetable}>
                  Update Timetable
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && isAssignedClassTeacher && activePage === 'qrcode' && (
          <QRCodeGenerator classes={classes} user={user} />
        )}
      </section>
    </div>
  )
}

export default FacultyDashboard
