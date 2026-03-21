import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'

import { db } from '../lib/firebase'

const STATUS_OPTIONS = ['pending', 'in_process', 'done']

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }
  return date.toLocaleString()
}

const normalizeStatusLabel = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'in_process') return 'In Process'
  if (value === 'done') return 'Done'
  return 'Pending'
}

function CampusInchargeDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard')
  const [complaints, setComplaints] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [remarkDraftById, setRemarkDraftById] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updatingComplaintId, setUpdatingComplaintId] = useState('')

  useEffect(() => {
    const complaintsQuery = collection(db, 'campusComplaints')

    const unsubscribe = onSnapshot(
      complaintsQuery,
      (snapshot) => {
        const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        rows.sort((a, b) => {
          const aTime = Date.parse(a.createdAt || '') || 0
          const bTime = Date.parse(b.createdAt || '') || 0
          return bTime - aTime
        })
        setComplaints(rows)
      },
      () => setErrorMessage('Unable to load campus complaints right now.'),
    )

    return () => unsubscribe()
  }, [])

  const weeklyDoneCount = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    return complaints.filter((item) => {
      if (String(item.status || '') !== 'done') {
        return false
      }
      const doneTime = Date.parse(item.resolvedAt || item.updatedAt || '') || 0
      return doneTime >= sevenDaysAgo
    }).length
  }, [complaints])

  const weeklyRaisedCount = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    return complaints.filter((item) => {
      const created = Date.parse(item.createdAt || '') || 0
      return created >= sevenDaysAgo
    }).length
  }, [complaints])

  const summary = useMemo(() => {
    const pending = complaints.filter((item) => item.status === 'pending').length
    const inProcess = complaints.filter((item) => item.status === 'in_process').length
    const done = complaints.filter((item) => item.status === 'done').length

    return {
      total: complaints.length,
      pending,
      inProcess,
      done,
    }
  }, [complaints])

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      const statusOk = statusFilter === 'all' || item.status === statusFilter
      const priorityOk = priorityFilter === 'all' || item.priority === priorityFilter
      return statusOk && priorityOk
    })
  }, [complaints, statusFilter, priorityFilter])

  const handleUpdateStatus = async (complaint, nextStatus) => {
    if (!complaint?.id || !STATUS_OPTIONS.includes(nextStatus)) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setUpdatingComplaintId(complaint.id)

    const remark = String(remarkDraftById[complaint.id] || '').trim()
    const nowIso = new Date().toISOString()
    const nextHistory = [
      ...(Array.isArray(complaint.statusHistory) ? complaint.statusHistory : []),
      {
        from: complaint.status || 'pending',
        to: nextStatus,
        remark,
        changedByUid: user?.uid || '',
        changedByName: user?.name || 'Campus Incharge',
        changedAt: nowIso,
      },
    ]

    try {
      await updateDoc(doc(db, 'campusComplaints', complaint.id), {
        status: nextStatus,
        updatedAt: nowIso,
        resolvedAt: nextStatus === 'done' ? nowIso : null,
        latestRemark: remark,
        statusHistory: nextHistory,
        handledByUid: user?.uid || '',
        handledByName: user?.name || 'Campus Incharge',
      })

      setRemarkDraftById((prev) => ({ ...prev, [complaint.id]: '' }))
      setSuccessMessage(`Complaint marked as ${normalizeStatusLabel(nextStatus)}.`)
    } catch {
      setErrorMessage('Unable to update complaint status right now.')
    } finally {
      setUpdatingComplaintId('')
    }
  }

  const sideItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'queue', label: 'Complaints Queue' },
    { key: 'history', label: 'History' },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h3>Campus Incharge</h3>
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
        <button type="button" onClick={onLogout}>Logout</button>
      </aside>

      <section className="admin-main">
        <div className="admin-navbar">
          <h2>Campus Complaints Console</h2>
          <p>{user?.name || 'Campus Incharge'}</p>
        </div>

        {errorMessage && <p className="field-error">{errorMessage}</p>}
        {successMessage && <p className="field-success">{successMessage}</p>}

        {activePage === 'dashboard' && (
          <>
            <div className="dashboard-grid" style={{ marginTop: 12 }}>
              <article>
                <h3>Total Complaints</h3>
                <p>{summary.total}</p>
              </article>
              <article>
                <h3>Pending</h3>
                <p>{summary.pending}</p>
              </article>
              <article>
                <h3>In Process</h3>
                <p>{summary.inProcess}</p>
              </article>
              <article>
                <h3>Done</h3>
                <p>{summary.done}</p>
              </article>
            </div>

            <div className="module-detail-grid" style={{ marginTop: 12 }}>
              <article className="module-detail-card">
                <div className="module-detail-head">
                  <span className="module-icon-chip">WK</span>
                  <h4>Weekly Work Done</h4>
                </div>
                <p className="module-main-value">Resolved in last 7 days: {weeklyDoneCount}</p>
              </article>

              <article className="module-detail-card">
                <div className="module-detail-head">
                  <span className="module-icon-chip">NW</span>
                  <h4>New This Week</h4>
                </div>
                <p className="module-main-value">Raised in last 7 days: {weeklyRaisedCount}</p>
              </article>

              <article className="module-detail-card">
                <div className="module-detail-head">
                  <span className="module-icon-chip">PD</span>
                  <h4>Work Pending</h4>
                </div>
                <p className="module-main-value">Open tickets: {summary.pending + summary.inProcess}</p>
              </article>
            </div>
          </>
        )}

        {activePage === 'queue' && (
          <div className="admin-panel-card" style={{ marginTop: 12 }}>
            <h3>Complaint Actions</h3>
            <div className="inline-actions" style={{ marginTop: 10 }}>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="done">Done</option>
              </select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="users-table-wrap" style={{ marginTop: 12 }}>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Photo</th>
                    <th>Remark</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="8">No complaints found for selected filters.</td>
                    </tr>
                  ) : (
                    filteredComplaints.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.studentName || 'Student'}</strong>
                          <div>{item.studentEmail || 'N/A'}</div>
                        </td>
                        <td>{item.complaintType || 'General'}</td>
                        <td>{String(item.priority || 'medium').toUpperCase()}</td>
                        <td>{normalizeStatusLabel(item.status)}</td>
                        <td>{item.description || 'N/A'}</td>
                        <td>
                          {item.photoUrl ? (
                            <a href={item.photoUrl} target="_blank" rel="noreferrer">View Photo</a>
                          ) : 'N/A'}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={remarkDraftById[item.id] || ''}
                            onChange={(event) => setRemarkDraftById((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))}
                            placeholder="Add progress note"
                          />
                        </td>
                        <td className="table-actions">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item, 'in_process')}
                            disabled={updatingComplaintId === item.id}
                          >
                            In Process
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item, 'done')}
                            disabled={updatingComplaintId === item.id}
                          >
                            Done
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activePage === 'history' && (
          <div className="admin-panel-card" style={{ marginTop: 12 }}>
            <h3>Complaint History</h3>
            <div className="users-table-wrap" style={{ marginTop: 12 }}>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Current Status</th>
                    <th>Raised At</th>
                    <th>Updated At</th>
                    <th>Latest Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan="5">No complaint history available.</td>
                    </tr>
                  ) : (
                    complaints.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.complaintType || 'General'}</strong>
                          <div>{item.description || 'N/A'}</div>
                        </td>
                        <td>{normalizeStatusLabel(item.status)}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                        <td>{item.latestRemark || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default CampusInchargeDashboard
