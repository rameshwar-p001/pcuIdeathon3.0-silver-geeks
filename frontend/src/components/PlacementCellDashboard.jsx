import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'

import { db } from '../lib/firebase'

const APPLICATION_STATUSES = ['applied', 'shortlisted', 'interview', 'selected', 'rejected']

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }
  return date.toLocaleString()
}

const normalizeStatusLabel = (value) => {
  const status = String(value || '').toLowerCase()
  if (status === 'in_process') return 'In Process'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function PlacementCellDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('companies')
  const [companies, setCompanies] = useState([])
  const [applications, setApplications] = useState([])
  const [grievances, setGrievances] = useState([])

  const [companyName, setCompanyName] = useState('')
  const [companyRole, setCompanyRole] = useState('')
  const [companyPackage, setCompanyPackage] = useState('')
  const [companyMinCgpa, setCompanyMinCgpa] = useState('')
  const [companyBranches, setCompanyBranches] = useState('')
  const [companyDriveDate, setCompanyDriveDate] = useState('')
  const [companyLastDate, setCompanyLastDate] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    const unsubscribeCompanies = onSnapshot(collection(db, 'placementCompanies'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setCompanies(rows)
    })

    const unsubscribeApplications = onSnapshot(collection(db, 'placementApplications'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setApplications(rows)
    })

    const unsubscribeGrievances = onSnapshot(collection(db, 'placementGrievances'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => {
        const aTime = Date.parse(a.createdAt || '') || 0
        const bTime = Date.parse(b.createdAt || '') || 0
        return bTime - aTime
      })
      setGrievances(rows)
    })

    return () => {
      unsubscribeCompanies()
      unsubscribeApplications()
      unsubscribeGrievances()
    }
  }, [])

  const companyMap = useMemo(() => {
    const map = new Map()
    companies.forEach((item) => map.set(item.id, item))
    return map
  }, [companies])

  const analytics = useMemo(() => {
    const selectedCount = applications.filter((item) => item.status === 'selected').length
    const rejectedCount = applications.filter((item) => item.status === 'rejected').length
    const openGrievances = grievances.filter((item) => item.status !== 'resolved').length

    return {
      totalCompanies: companies.length,
      totalApplied: applications.length,
      selectedCount,
      rejectedCount,
      openGrievances,
    }
  }, [applications, companies.length, grievances])

  const resultRows = applications.filter((item) => item.status === 'selected' || item.status === 'rejected')

  const handleAddCompany = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const name = companyName.trim()
    const role = companyRole.trim()
    const ctc = companyPackage.trim()
    const minCgpa = Number.parseFloat(companyMinCgpa)
    const branches = companyBranches
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (!name || !role || !ctc || Number.isNaN(minCgpa) || !companyDriveDate || !companyLastDate) {
      setErrorMessage('Please fill all company details correctly.')
      return
    }

    setIsSavingCompany(true)

    try {
      await addDoc(collection(db, 'placementCompanies'), {
        companyName: name,
        role,
        packageCtc: ctc,
        minCgpa,
        allowedBranches: branches,
        driveDate: companyDriveDate,
        lastDate: companyLastDate,
        createdByUid: user?.uid || '',
        createdByName: user?.name || 'Placement Cell',
        createdAt: new Date().toISOString(),
      })

      setCompanyName('')
      setCompanyRole('')
      setCompanyPackage('')
      setCompanyMinCgpa('')
      setCompanyBranches('')
      setCompanyDriveDate('')
      setCompanyLastDate('')
      setSuccessMessage('Company drive added successfully.')
    } catch {
      setErrorMessage('Unable to add company drive right now.')
    } finally {
      setIsSavingCompany(false)
    }
  }

  const handleUpdateApplicationStatus = async (application, nextStatus) => {
    if (!application?.id || !APPLICATION_STATUSES.includes(nextStatus)) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setUpdatingId(application.id)

    const nowIso = new Date().toISOString()
    const history = [
      ...(Array.isArray(application.statusHistory) ? application.statusHistory : []),
      {
        from: application.status || 'applied',
        to: nextStatus,
        changedAt: nowIso,
        changedByUid: user?.uid || '',
        changedByName: user?.name || 'Placement Cell',
      },
    ]

    try {
      await updateDoc(doc(db, 'placementApplications', application.id), {
        status: nextStatus,
        statusHistory: history,
        updatedAt: nowIso,
      })

      setSuccessMessage(`Application updated to ${normalizeStatusLabel(nextStatus)}.`)
    } catch {
      setErrorMessage('Unable to update application status.')
    } finally {
      setUpdatingId('')
    }
  }

  const handleUpdateGrievance = async (grievance, nextStatus) => {
    if (!grievance?.id) {
      return
    }

    setUpdatingId(grievance.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateDoc(doc(db, 'placementGrievances', grievance.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        resolvedByUid: user?.uid || '',
        resolvedByName: user?.name || 'Placement Cell',
      })
      setSuccessMessage(`Grievance marked as ${normalizeStatusLabel(nextStatus)}.`)
    } catch {
      setErrorMessage('Unable to update grievance status.')
    } finally {
      setUpdatingId('')
    }
  }

  const navItems = [
    { key: 'companies', label: 'Company Management' },
    { key: 'applications', label: 'Application Management' },
    { key: 'results', label: 'Result Management' },
    { key: 'grievances', label: 'Grievances' },
    { key: 'analytics', label: 'Analytics' },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h3>Placement Cell</h3>
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
          <h2>Placement Cell Dashboard</h2>
          <p>{user?.name || 'Officer'}</p>
        </div>

        {errorMessage && <p className="field-error">{errorMessage}</p>}
        {successMessage && <p className="field-success">{successMessage}</p>}

        {activePage === 'companies' && (
          <div className="module-detail-grid" style={{ marginTop: 12 }}>
            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">CM</span>
                <h4>Add Company Drive</h4>
              </div>

              <form className="auth-form" onSubmit={handleAddCompany}>
                <label htmlFor="company-name">Company Name</label>
                <input id="company-name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />

                <label htmlFor="company-role">Role</label>
                <input id="company-role" value={companyRole} onChange={(event) => setCompanyRole(event.target.value)} placeholder="SDE / Analyst" required />

                <label htmlFor="company-ctc">Package (CTC)</label>
                <input id="company-ctc" value={companyPackage} onChange={(event) => setCompanyPackage(event.target.value)} placeholder="8 LPA" required />

                <label htmlFor="company-min-cgpa">Minimum CGPI</label>
                <input id="company-min-cgpa" type="number" min="0" max="10" step="0.01" value={companyMinCgpa} onChange={(event) => setCompanyMinCgpa(event.target.value)} required />

                <label htmlFor="company-branches">Allowed Branches</label>
                <input id="company-branches" value={companyBranches} onChange={(event) => setCompanyBranches(event.target.value)} placeholder="CSE, IT, AIML" />

                <label htmlFor="company-drive-date">Drive Date</label>
                <input id="company-drive-date" type="date" value={companyDriveDate} onChange={(event) => setCompanyDriveDate(event.target.value)} required />

                <label htmlFor="company-last-date">Last Date to Apply</label>
                <input id="company-last-date" type="date" value={companyLastDate} onChange={(event) => setCompanyLastDate(event.target.value)} required />

                <button type="submit" className="submit-btn" disabled={isSavingCompany}>
                  {isSavingCompany ? 'Saving...' : 'Add Company'}
                </button>
              </form>
            </article>

            <article className="module-detail-card module-detail-card-wide">
              <div className="module-detail-head">
                <span className="module-icon-chip">CL</span>
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
                      <th>Drive Date</th>
                      <th>Last Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.length === 0 ? (
                      <tr><td colSpan="6">No drives added yet.</td></tr>
                    ) : (
                      companies.map((company) => (
                        <tr key={company.id}>
                          <td>{company.companyName || 'N/A'}</td>
                          <td>{company.role || 'N/A'}</td>
                          <td>{company.packageCtc || 'N/A'}</td>
                          <td>
                            Min CGPI {Number(company.minCgpa) || 0}
                            <div>{Array.isArray(company.allowedBranches) && company.allowedBranches.length > 0 ? company.allowedBranches.join(', ') : 'All branches'}</div>
                          </td>
                          <td>{company.driveDate || 'N/A'}</td>
                          <td>{company.lastDate || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activePage === 'applications' && (
          <div className="admin-panel-card" style={{ marginTop: 12 }}>
            <h3>Application Management</h3>
            <div className="users-table-wrap" style={{ marginTop: 12 }}>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Enrollment</th>
                    <th>Company</th>
                    <th>Resume</th>
                    <th>CGPI</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr><td colSpan="7">No applications yet.</td></tr>
                  ) : (
                    applications.map((application) => {
                      const company = companyMap.get(application.companyId)
                      const companyName = application.companyName || company?.companyName || 'N/A'

                      return (
                        <tr key={application.id}>
                          <td>{application.studentName || 'N/A'}</td>
                          <td>{application.enrollmentNumber || 'N/A'}</td>
                          <td>{companyName}</td>
                          <td>
                            {application.resumeUrl ? (
                              <a href={application.resumeUrl} target="_blank" rel="noreferrer">View Resume</a>
                            ) : 'N/A'}
                          </td>
                          <td>{application.cgpi || 'N/A'}</td>
                          <td>{normalizeStatusLabel(application.status)}</td>
                          <td className="table-actions">
                            <button type="button" onClick={() => handleUpdateApplicationStatus(application, 'shortlisted')} disabled={updatingId === application.id}>Shortlist</button>
                            <button type="button" onClick={() => handleUpdateApplicationStatus(application, 'interview')} disabled={updatingId === application.id}>Interview</button>
                            <button type="button" onClick={() => handleUpdateApplicationStatus(application, 'selected')} disabled={updatingId === application.id}>Select</button>
                            <button type="button" onClick={() => handleUpdateApplicationStatus(application, 'rejected')} disabled={updatingId === application.id}>Reject</button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activePage === 'results' && (
          <div className="admin-panel-card" style={{ marginTop: 12 }}>
            <h3>Result Management</h3>
            <div className="users-table-wrap" style={{ marginTop: 12 }}>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Company</th>
                    <th>Final Result</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.length === 0 ? (
                    <tr><td colSpan="4">No final results yet.</td></tr>
                  ) : (
                    resultRows.map((item) => (
                      <tr key={item.id}>
                        <td>{item.studentName || 'N/A'}</td>
                        <td>{item.companyName || companyMap.get(item.companyId)?.companyName || 'N/A'}</td>
                        <td>{item.status === 'selected' ? 'Selected' : 'Rejected'}</td>
                        <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activePage === 'grievances' && (
          <div className="admin-panel-card" style={{ marginTop: 12 }}>
            <h3>Grievance Handling</h3>
            <div className="users-table-wrap" style={{ marginTop: 12 }}>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grievances.length === 0 ? (
                    <tr><td colSpan="5">No grievances yet.</td></tr>
                  ) : (
                    grievances.map((grievance) => (
                      <tr key={grievance.id}>
                        <td>{grievance.studentName || 'N/A'}</td>
                        <td>{grievance.subject || 'N/A'}</td>
                        <td>{grievance.description || 'N/A'}</td>
                        <td>{normalizeStatusLabel(grievance.status || 'open')}</td>
                        <td className="table-actions">
                          <button type="button" onClick={() => handleUpdateGrievance(grievance, 'in_process')} disabled={updatingId === grievance.id}>In Process</button>
                          <button type="button" onClick={() => handleUpdateGrievance(grievance, 'resolved')} disabled={updatingId === grievance.id}>Resolve</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activePage === 'analytics' && (
          <div className="dashboard-grid" style={{ marginTop: 12 }}>
            <article>
              <h3>Total Companies</h3>
              <p>{analytics.totalCompanies}</p>
            </article>
            <article>
              <h3>Total Students Applied</h3>
              <p>{analytics.totalApplied}</p>
            </article>
            <article>
              <h3>Selected Count</h3>
              <p>{analytics.selectedCount}</p>
            </article>
            <article>
              <h3>Rejected Count</h3>
              <p>{analytics.rejectedCount}</p>
            </article>
            <article>
              <h3>Open Grievances</h3>
              <p>{analytics.openGrievances}</p>
            </article>
          </div>
        )}
      </section>
    </div>
  )
}

export default PlacementCellDashboard
