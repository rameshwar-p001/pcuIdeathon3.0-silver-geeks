import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'

import { db } from '../lib/firebase'

const PASS_MARK = 35

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }
  return date.toLocaleString()
}

function ExamCoordinatorDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('forms')
  const [students, setStudents] = useState([])
  const [examForms, setExamForms] = useState([])
  const [examTimetable, setExamTimetable] = useState([])
  const [studentTimetableSubjects, setStudentTimetableSubjects] = useState([])
  const [hallTickets, setHallTickets] = useState([])
  const [examResults, setExamResults] = useState([])
  const [examNotifications, setExamNotifications] = useState([])
  const [examConfig, setExamConfig] = useState({ formOpen: false, formDeadline: '' })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formDeadline, setFormDeadline] = useState('')

  const [timetableDepartment, setTimetableDepartment] = useState('')
  const [timetableSubject, setTimetableSubject] = useState('')
  const [timetableDate, setTimetableDate] = useState('')
  const [timetableTime, setTimetableTime] = useState('')

  const [hallTicketStudentUid, setHallTicketStudentUid] = useState('')
  const [hallTicketCenter, setHallTicketCenter] = useState('')
  const [hallTicketSeatNumber, setHallTicketSeatNumber] = useState('')

  const [resultStudentUid, setResultStudentUid] = useState('')
  const [resultMarksMap, setResultMarksMap] = useState({})

  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ uid: item.id, ...item.data() }))
      rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      setStudents(rows)
    })

    const unsubscribeForms = onSnapshot(collection(db, 'examForms'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
      setExamForms(rows)
    })

    const unsubscribeTimetable = onSnapshot(collection(db, 'examTimetable'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aDate = Date.parse(a.date || '') || 0
        const bDate = Date.parse(b.date || '') || 0
        if (aDate !== bDate) return aDate - bDate
        return String(a.time || '').localeCompare(String(b.time || ''))
      })
      setExamTimetable(rows)
    })

    const unsubscribeStudentTimetable = onSnapshot(collection(db, 'timetable'), (snapshot) => {
      const subjectSet = new Set()

      snapshot.docs.forEach((item) => {
        const data = item.data()
        const subject = String(data.subject || '').trim()
        if (subject) {
          subjectSet.add(subject)
        }
      })

      setStudentTimetableSubjects(Array.from(subjectSet).sort((a, b) => a.localeCompare(b)))
    })

    const unsubscribeHallTickets = onSnapshot(collection(db, 'examHallTickets'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setHallTickets(rows)
    })

    const unsubscribeResults = onSnapshot(collection(db, 'examResults'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setExamResults(rows)
    })

    const unsubscribeNotifications = onSnapshot(collection(db, 'examNotifications'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
      setExamNotifications(rows)
    })

    const unsubscribeConfig = onSnapshot(doc(db, 'examConfig', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        const value = snapshot.data()
        const nextConfig = {
          formOpen: Boolean(value.formOpen),
          formDeadline: value.formDeadline || '',
        }
        setExamConfig(nextConfig)
        setIsFormOpen(nextConfig.formOpen)
        setFormDeadline(nextConfig.formDeadline)
      }
    })

    return () => {
      unsubscribeUsers()
      unsubscribeForms()
      unsubscribeTimetable()
      unsubscribeStudentTimetable()
      unsubscribeHallTickets()
      unsubscribeResults()
      unsubscribeNotifications()
      unsubscribeConfig()
    }
  }, [])

  const formsByStudentUid = useMemo(() => {
    const map = new Map()
    examForms.forEach((form) => map.set(form.studentUid, form))
    return map
  }, [examForms])

  const selectedResultForm = useMemo(
    () => examForms.find((item) => item.studentUid === resultStudentUid) || null,
    [examForms, resultStudentUid],
  )

  useEffect(() => {
    if (!selectedResultForm) {
      setResultMarksMap({})
      return
    }

    const subjects = Array.isArray(selectedResultForm.subjects) ? selectedResultForm.subjects : []
    const nextMap = {}
    subjects.forEach((subject) => {
      nextMap[subject] = ''
    })
    setResultMarksMap(nextMap)
  }, [selectedResultForm?.id])

  const analytics = useMemo(() => {
    const publishedResults = examResults.filter((item) => item.published)
    const passCount = publishedResults.filter((item) => item.result === 'Pass').length
    const failCount = publishedResults.filter((item) => item.result === 'Fail').length
    const passPercentage = publishedResults.length > 0
      ? Number(((passCount / publishedResults.length) * 100).toFixed(2))
      : 0

    const topStudents = [...publishedResults]
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
      .slice(0, 5)

    return {
      totalForms: examForms.length,
      publishedResults: publishedResults.length,
      passCount,
      failCount,
      passPercentage,
      topStudents,
    }
  }, [examForms.length, examResults])

  const departmentOptions = useMemo(() => {
    const departmentSet = new Set()

    students.forEach((student) => {
      const department = String(student.department || '').trim()
      if (department) {
        departmentSet.add(department)
      }
    })

    return Array.from(departmentSet).sort((a, b) => a.localeCompare(b))
  }, [students])

  const handleSaveFormSettings = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      await setDoc(doc(db, 'examConfig', 'current'), {
        formOpen: isFormOpen,
        formDeadline: formDeadline || '',
        updatedAt: new Date().toISOString(),
        updatedByUid: user?.uid || '',
        updatedByName: user?.name || 'Exam Coordinator',
      })
      setSuccessMessage('Exam form settings updated.')
    } catch {
      setErrorMessage('Unable to save exam form settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTimetableEntry = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const department = timetableDepartment.trim()
    const subject = timetableSubject.trim()
    const date = timetableDate.trim()
    const time = timetableTime.trim()

    if (!department || !subject || !date || !time) {
      setErrorMessage('Department, subject, date and time are required.')
      return
    }

    setIsSaving(true)

    try {
      await addDoc(collection(db, 'examTimetable'), {
        department,
        subject,
        date,
        time,
        createdAt: new Date().toISOString(),
        createdByUid: user?.uid || '',
      })

      setTimetableDepartment('')
      setTimetableSubject('')
      setTimetableDate('')
      setTimetableTime('')
      setSuccessMessage('Exam timetable entry added.')
    } catch {
      setErrorMessage('Unable to add timetable entry.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTimetableEntry = async (entryId) => {
    if (!entryId) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      await deleteDoc(doc(db, 'examTimetable', entryId))
      setSuccessMessage('Timetable entry removed successfully.')
    } catch {
      setErrorMessage('Unable to remove timetable entry right now.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateHallTicket = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const studentUid = hallTicketStudentUid.trim()
    const center = hallTicketCenter.trim()
    const seatNumber = hallTicketSeatNumber.trim()

    if (!studentUid || !center || !seatNumber) {
      setErrorMessage('Student, exam center and seat number are required.')
      return
    }

    const student = students.find((item) => item.uid === studentUid)
    const submittedForm = formsByStudentUid.get(studentUid)

    if (!student || !submittedForm) {
      setErrorMessage('Student exam form submission is required before hall ticket generation.')
      return
    }

    const subjects = Array.isArray(submittedForm.subjects) ? submittedForm.subjects : []
    const studentClassId = String(student.classId || student.class_id || '').trim().toLowerCase()
    const studentDepartment = String(student.department || '').trim().toLowerCase()
    const timetableRows = examTimetable.filter((row) => {
      const rowClassId = String(row.classId || '').trim().toLowerCase()
      const rowDepartment = String(row.department || '').trim().toLowerCase()

      if (rowDepartment && studentDepartment) {
        return rowDepartment === studentDepartment
      }

      if (rowClassId && studentClassId) {
        return rowClassId === studentClassId
      }

      return false
    })

    setIsSaving(true)

    try {
      await setDoc(doc(db, 'examHallTickets', studentUid), {
        studentUid,
        studentName: student.name || 'Student',
        enrollmentNumber: student.enrollmentNumber || student.id || 'N/A',
        classId: student.classId || student.class_id || '',
                department: student.department || '',
        examCenter: center,
        seatNumber,
        subjects,
        timetable: timetableRows,
        generatedAt: new Date().toISOString(),
        generatedByUid: user?.uid || '',
      })

      setSuccessMessage('Hall ticket generated successfully.')
      setHallTicketCenter('')
      setHallTicketSeatNumber('')
    } catch {
      setErrorMessage('Unable to generate hall ticket.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishResult = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!resultStudentUid || !selectedResultForm) {
      setErrorMessage('Select student with submitted exam form.')
      return
    }

    const student = students.find((item) => item.uid === resultStudentUid)
    const subjects = Array.isArray(selectedResultForm.subjects) ? selectedResultForm.subjects : []

    if (!student || subjects.length === 0) {
      setErrorMessage('No subjects found for selected student form.')
      return
    }

    const marksRows = []
    const backlogSubjects = []
    let total = 0

    for (const subject of subjects) {
      const raw = String(resultMarksMap[subject] || '').trim()
      const marks = Number.parseFloat(raw)
      if (Number.isNaN(marks) || marks < 0 || marks > 100) {
        setErrorMessage(`Enter valid marks (0-100) for ${subject}.`)
        return
      }

      marksRows.push({ subject, marks })
      total += marks
      if (marks < PASS_MARK) {
        backlogSubjects.push(subject)
      }
    }

    const average = marksRows.length > 0 ? Number((total / marksRows.length).toFixed(2)) : 0
    const result = backlogSubjects.length > 0 ? 'Fail' : 'Pass'

    setIsSaving(true)

    try {
      await setDoc(doc(db, 'examResults', resultStudentUid), {
        studentUid: resultStudentUid,
        studentName: student.name || 'Student',
        enrollmentNumber: student.enrollmentNumber || student.id || 'N/A',
        classId: student.classId || student.class_id || '',
        marks: marksRows,
        total,
        average,
        result,
        backlogSubjects,
        published: true,
        publishedAt: new Date().toISOString(),
        publishedByUid: user?.uid || '',
      })

      setSuccessMessage('Result published successfully.')
    } catch {
      setErrorMessage('Unable to publish result.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePostNotification = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const title = notificationTitle.trim()
    const message = notificationMessage.trim()

    if (!title || !message) {
      setErrorMessage('Notification title and message are required.')
      return
    }

    setIsSaving(true)

    try {
      await addDoc(collection(db, 'examNotifications'), {
        title,
        message,
        createdAt: new Date().toISOString(),
        createdByUid: user?.uid || '',
        createdByName: user?.name || 'Exam Coordinator',
      })

      setNotificationTitle('')
      setNotificationMessage('')
      setSuccessMessage('Notification posted successfully.')
    } catch {
      setErrorMessage('Unable to post notification.')
    } finally {
      setIsSaving(false)
    }
  }

  const markFormEligibility = async (form, allowed) => {
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateDoc(doc(db, 'examForms', form.id), {
        coordinatorEligibility: allowed ? 'approved' : 'blocked',
        coordinatorCheckedAt: new Date().toISOString(),
        coordinatorCheckedByUid: user?.uid || '',
      })
      setSuccessMessage(`Form ${allowed ? 'approved' : 'blocked'} successfully.`)
    } catch {
      setErrorMessage('Unable to update form eligibility.')
    } finally {
      setIsSaving(false)
    }
  }

  const navItems = [
    { key: 'forms', label: 'Exam Form Management' },
    { key: 'timetable', label: 'Timetable Management' },
    { key: 'hallTicket', label: 'Hall Ticket Generation' },
    { key: 'results', label: 'Result Management' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'analytics', label: 'Analytics' },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h3>Exam Coordinator</h3>
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activePage === item.key ? 'active' : ''}
            onClick={() => setActivePage(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={onLogout}>Logout</button>
      </aside>

      <section className="admin-main">
        <div className="admin-navbar">
          <h2>Exam Control Center</h2>
          <p>{user?.name || 'Coordinator'}</p>
        </div>

        {errorMessage && <p className="field-error">{errorMessage}</p>}
        {successMessage && <p className="field-success">{successMessage}</p>}

        {activePage === 'forms' && (
          <div className="module-detail-grid" style={{ marginTop: 12 }}>
            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">FM</span>
                <h4>Open / Close Exam Form</h4>
              </div>
              <div className="inline-actions">
                <button
                  type="button"
                  className={`secondary-btn ${isFormOpen ? '' : 'active'}`}
                  onClick={() => setIsFormOpen((prev) => !prev)}
                >
                  {isFormOpen ? 'Form Open' : 'Form Closed'}
                </button>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(event) => setFormDeadline(event.target.value)}
                />
                <button type="button" className="submit-btn" disabled={isSaving} onClick={handleSaveFormSettings}>
                  Save Settings
                </button>
              </div>
              <p className="login-hint">
                Current: {examConfig.formOpen ? 'Open' : 'Closed'}
                {examConfig.formDeadline ? ` | Deadline: ${examConfig.formDeadline}` : ''}
              </p>
            </article>

            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">SF</span>
                <h4>Submitted Forms and Eligibility</h4>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Enrollment</th>
                      <th>Attendance</th>
                      <th>Fees</th>
                      <th>System Eligibility</th>
                      <th>Coordinator Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examForms.length === 0 ? (
                      <tr><td colSpan="6">No exam forms submitted yet.</td></tr>
                    ) : (
                      examForms.map((form) => (
                        <tr key={form.id}>
                          <td>{form.studentName || 'N/A'}</td>
                          <td>{form.enrollmentNumber || 'N/A'}</td>
                          <td>{Number(form.attendancePercentage || 0).toFixed(2)}%</td>
                          <td>{String(form.feeStatus || 'N/A')}</td>
                          <td>{form.systemEligibility ? 'Eligible' : 'Blocked'}</td>
                          <td className="table-actions">
                            <button type="button" disabled={isSaving} onClick={() => markFormEligibility(form, true)}>Approve</button>
                            <button type="button" disabled={isSaving} onClick={() => markFormEligibility(form, false)}>Block</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activePage === 'timetable' && (
          <div className="module-detail-grid" style={{ marginTop: 12 }}>
            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">TT</span>
                <h4>Create Exam Timetable</h4>
              </div>
              <form className="auth-form" onSubmit={handleAddTimetableEntry}>
                <label htmlFor="exam-department">Department</label>
                <select
                  id="exam-department"
                  value={timetableDepartment}
                  onChange={(event) => setTimetableDepartment(event.target.value)}
                  required
                >
                  <option value="">Select department</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>

                <label htmlFor="exam-subject">Subject</label>
                <select
                  id="exam-subject"
                  value={timetableSubject}
                  onChange={(event) => setTimetableSubject(event.target.value)}
                  required
                >
                  <option value="">Select subject</option>
                  {studentTimetableSubjects.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>

                <label htmlFor="exam-date">Date</label>
                <input id="exam-date" type="date" value={timetableDate} onChange={(event) => setTimetableDate(event.target.value)} required />

                <label htmlFor="exam-time">Time</label>
                <input id="exam-time" value={timetableTime} onChange={(event) => setTimetableTime(event.target.value)} placeholder="09:00 AM - 12:00 PM" required />

                <button type="submit" className="submit-btn" disabled={isSaving}>Add Timetable Entry</button>
              </form>
            </article>

            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">TL</span>
                <h4>Timetable List</h4>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examTimetable.length === 0 ? (
                      <tr><td colSpan="5">No exam timetable created yet.</td></tr>
                    ) : (
                      examTimetable.map((row) => (
                        <tr key={row.id}>
                          <td>{row.department || String(row.classId || '').toUpperCase() || 'N/A'}</td>
                          <td>{row.subject || 'N/A'}</td>
                          <td>{row.date || 'N/A'}</td>
                          <td>{row.time || 'N/A'}</td>
                          <td className="table-actions">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleDeleteTimetableEntry(row.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activePage === 'hallTicket' && (
          <div className="module-detail-grid" style={{ marginTop: 12 }}>
            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">HT</span>
                <h4>Generate Hall Ticket</h4>
              </div>
              <form className="auth-form" onSubmit={handleGenerateHallTicket}>
                <label htmlFor="hall-student">Student</label>
                <select
                  id="hall-student"
                  value={hallTicketStudentUid}
                  onChange={(event) => setHallTicketStudentUid(event.target.value)}
                  required
                >
                  <option value="">Select student</option>
                  {examForms.map((form) => (
                    <option key={form.studentUid} value={form.studentUid}>
                      {form.studentName || 'Student'} ({form.enrollmentNumber || form.studentUid})
                    </option>
                  ))}
                </select>

                <label htmlFor="hall-center">Exam Center</label>
                <input id="hall-center" value={hallTicketCenter} onChange={(event) => setHallTicketCenter(event.target.value)} required />

                <label htmlFor="hall-seat">Seat Number</label>
                <input id="hall-seat" value={hallTicketSeatNumber} onChange={(event) => setHallTicketSeatNumber(event.target.value)} required />

                <button type="submit" className="submit-btn" disabled={isSaving}>Generate Hall Ticket</button>
              </form>
            </article>

            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">HL</span>
                <h4>Generated Hall Tickets</h4>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Seat Number</th>
                      <th>Center</th>
                      <th>Generated At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hallTickets.length === 0 ? (
                      <tr><td colSpan="4">No hall tickets generated yet.</td></tr>
                    ) : (
                      hallTickets.map((ticket) => (
                        <tr key={ticket.id}>
                          <td>{ticket.studentName || 'N/A'}</td>
                          <td>{ticket.seatNumber || 'N/A'}</td>
                          <td>{ticket.examCenter || 'N/A'}</td>
                          <td>{formatDate(ticket.generatedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activePage === 'results' && (
          <div className="module-detail-grid" style={{ marginTop: 12 }}>
            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">RM</span>
                <h4>Publish Student Results</h4>
              </div>
              <form className="auth-form" onSubmit={handlePublishResult}>
                <label htmlFor="result-student">Student</label>
                <select
                  id="result-student"
                  value={resultStudentUid}
                  onChange={(event) => setResultStudentUid(event.target.value)}
                  required
                >
                  <option value="">Select student</option>
                  {examForms.map((form) => (
                    <option key={form.studentUid} value={form.studentUid}>
                      {form.studentName || 'Student'} ({form.enrollmentNumber || form.studentUid})
                    </option>
                  ))}
                </select>

                {selectedResultForm && (
                  <>
                    {(Array.isArray(selectedResultForm.subjects) ? selectedResultForm.subjects : []).map((subject) => (
                      <div key={subject}>
                        <label htmlFor={`marks-${subject}`}>{subject} Marks</label>
                        <input
                          id={`marks-${subject}`}
                          type="number"
                          min="0"
                          max="100"
                          value={resultMarksMap[subject] || ''}
                          onChange={(event) => setResultMarksMap((prev) => ({
                            ...prev,
                            [subject]: event.target.value,
                          }))}
                          required
                        />
                      </div>
                    ))}
                  </>
                )}

                <button type="submit" className="submit-btn" disabled={isSaving}>Publish Result</button>
              </form>
            </article>

            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">RL</span>
                <h4>Published Results</h4>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Total</th>
                      <th>Average</th>
                      <th>Result</th>
                      <th>Backlog</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.length === 0 ? (
                      <tr><td colSpan="5">No results published yet.</td></tr>
                    ) : (
                      examResults.map((result) => (
                        <tr key={result.id}>
                          <td>{result.studentName || 'N/A'}</td>
                          <td>{result.total || 0}</td>
                          <td>{result.average || 0}</td>
                          <td>{result.result || 'N/A'}</td>
                          <td>
                            {Array.isArray(result.backlogSubjects) && result.backlogSubjects.length > 0
                              ? result.backlogSubjects.join(', ')
                              : 'None'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activePage === 'notifications' && (
          <div className="module-detail-grid" style={{ marginTop: 12 }}>
            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">NT</span>
                <h4>Post Exam Notification</h4>
              </div>
              <form className="auth-form" onSubmit={handlePostNotification}>
                <label htmlFor="exam-notification-title">Title</label>
                <input
                  id="exam-notification-title"
                  value={notificationTitle}
                  onChange={(event) => setNotificationTitle(event.target.value)}
                  required
                />

                <label htmlFor="exam-notification-message">Message</label>
                <textarea
                  id="exam-notification-message"
                  rows={3}
                  value={notificationMessage}
                  onChange={(event) => setNotificationMessage(event.target.value)}
                  required
                />

                <button type="submit" className="submit-btn" disabled={isSaving}>Post Notification</button>
              </form>
            </article>

            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">NL</span>
                <h4>Exam Notification Feed</h4>
              </div>
              <ul className="module-list">
                {examNotifications.length === 0 ? (
                  <li>No notifications posted yet.</li>
                ) : (
                  examNotifications.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>: {item.message} ({formatDate(item.createdAt)})
                    </li>
                  ))
                )}
              </ul>
            </article>
          </div>
        )}

        {activePage === 'analytics' && (
          <>
            <div className="dashboard-grid" style={{ marginTop: 12 }}>
              <article>
                <h3>Total Submitted Forms</h3>
                <p>{analytics.totalForms}</p>
              </article>
              <article>
                <h3>Published Results</h3>
                <p>{analytics.publishedResults}</p>
              </article>
              <article>
                <h3>Pass %</h3>
                <p>{analytics.passPercentage}%</p>
              </article>
              <article>
                <h3>Pass Count</h3>
                <p>{analytics.passCount}</p>
              </article>
              <article>
                <h3>Fail Count</h3>
                <p>{analytics.failCount}</p>
              </article>
            </div>

            <article className="module-detail-card" style={{ marginTop: 12 }}>
              <div className="module-detail-head">
                <span className="module-icon-chip">TP</span>
                <h4>Top Students</h4>
              </div>
              <ul className="module-list">
                {analytics.topStudents.length === 0 ? (
                  <li>No result data yet.</li>
                ) : (
                  analytics.topStudents.map((student) => (
                    <li key={student.studentUid || student.id}>
                      {student.studentName || 'Student'} - {student.total || 0}
                    </li>
                  ))
                )}
              </ul>
            </article>
          </>
        )}
      </section>
    </div>
  )
}

export default ExamCoordinatorDashboard
