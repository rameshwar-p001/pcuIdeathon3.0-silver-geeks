function formatDate(value) {
  if (!value) {
    return 'N/A'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function formatRequestedChanges(requestedChanges) {
  if (!requestedChanges || Object.keys(requestedChanges).length === 0) {
    return 'Suggestion note only'
  }

  return Object.entries(requestedChanges)
    .map(([field, value]) => `${field}: ${value}`)
    .join(', ')
}

function ProfileChangeRequestsPanel({ requests, onApprove, onReject }) {
  return (
    <div className="admin-panel-card">
      <h3>Profile Change Requests</h3>
      <p className="login-hint">Approve requests to update student profile records in ERP.</p>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Enrollment No</th>
              <th>Requested Changes</th>
              <th>Suggestion</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7">No profile change requests yet.</td>
              </tr>
            ) : (
              requests.map((request) => {
                const isPending = request.status === 'pending'

                return (
                  <tr key={request.id}>
                    <td>{request.studentName || 'N/A'}</td>
                    <td>{request.enrollmentNumber || 'N/A'}</td>
                    <td>{formatRequestedChanges(request.requestedChanges)}</td>
                    <td>{request.suggestionNote || '-'}</td>
                    <td>
                      <span className={`request-status status-${request.status || 'pending'}`}>
                        {request.status || 'pending'}
                      </span>
                    </td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        onClick={() => onApprove(request.id)}
                        disabled={!isPending}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(request.id)}
                        disabled={!isPending}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProfileChangeRequestsPanel
