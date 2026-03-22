import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

const normalizeText = (value) => String(value || '').trim()

const buildSubjectSummary = (rows = []) => {
  const summaryBySubject = new Map()

  rows.forEach((row) => {
    const subject = normalizeText(row.subject) || 'General'
    const status = normalizeText(row.status).toLowerCase()
    const isCounted = status === 'present' || status === 'absent' || status === 'leave'

    if (!isCounted) {
      return
    }

    const current = summaryBySubject.get(subject) || { subject, present: 0, total: 0 }
    current.total += 1
    if (status === 'present') {
      current.present += 1
    }
    summaryBySubject.set(subject, current)
  })

  return Array.from(summaryBySubject.values())
    .map((item) => ({
      ...item,
      percentage: item.total > 0 ? Number(((item.present / item.total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject))
}

function StudentAttendanceOverview({ user, attendanceRows = null }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const hasExternalRows = Array.isArray(attendanceRows)

  useEffect(() => {
    if (hasExternalRows) {
      const normalizedRows = [...attendanceRows].sort((a, b) => {
        const aDate = Date.parse(a.date || a.attendance_date || a.createdAt || a.markedAt || '') || 0
        const bDate = Date.parse(b.date || b.attendance_date || b.createdAt || b.markedAt || '') || 0
        return bDate - aDate
      })

      setRows(normalizedRows)
      setErrorMessage('')
      setLoading(false)
      return
    }

    const loadAttendance = async () => {
      if (!user?.uid) {
        setRows([])
        setLoading(false)
        setErrorMessage('Student session is unavailable.')
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await apiRequest(`/api/attendance/user/${encodeURIComponent(user.uid)}`)
        setRows(response.data || [])
      } catch (error) {
        setErrorMessage(error?.message || 'Unable to load attendance records.')
      } finally {
        setLoading(false)
      }
    }

    loadAttendance()
  }, [user?.uid, hasExternalRows, attendanceRows])

  const subjectSummary = buildSubjectSummary(rows)

  return (
    <section className="admin-panel-card">
      <h3>Attendance Records</h3>
      <p className="login-hint">
        Attendance is now marked by faculty using class photo AI matching.
      </p>

      {loading && <p className="login-hint">Loading attendance records...</p>}
      {!loading && errorMessage && <p className="field-error">{errorMessage}</p>}

      {!loading && !errorMessage && (
        <div className="users-table-wrap">
          <table className="users-table" style={{ marginBottom: 14 }}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Present</th>
                <th>Total</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {subjectSummary.length === 0 ? (
                <tr>
                  <td colSpan="4">No subject-wise attendance available yet.</td>
                </tr>
              ) : (
                subjectSummary.map((item) => (
                  <tr key={item.subject}>
                    <td>{item.subject}</td>
                    <td>{item.present}</td>
                    <td>{item.total}</td>
                    <td>{item.percentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <table className="users-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Department</th>
                <th>Division</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="6">No attendance records available.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date || row.attendance_date || 'N/A'}</td>
                    <td>{row.department || 'N/A'}</td>
                    <td>{row.division || row.class_id || row.className || 'N/A'}</td>
                    <td>{row.subject || 'General'}</td>
                    <td>{row.status || 'present'}</td>
                    <td>{row.source || 'manual'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default StudentAttendanceOverview
