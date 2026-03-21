import { useState } from 'react'

function ManageUsersTable({ users, onEditUser, onDeleteUser }) {
  const [activeTab, setActiveTab] = useState('faculty')

  const facultyUsers = users.filter((user) => user.role === 'Faculty')
  const studentUsers = users.filter((user) => user.role === 'Student')
  const inchargeUsers = users.filter((user) => user.role === 'Campus Incharge')
  const placementUsers = users.filter((user) => user.role === 'Placement Cell')
  const examCoordinatorUsers = users.filter((user) => user.role === 'Exam Coordinator')

  const displayUsers = activeTab === 'faculty'
    ? facultyUsers
    : activeTab === 'student'
      ? studentUsers
      : activeTab === 'incharge'
        ? inchargeUsers
        : activeTab === 'placement'
          ? placementUsers
          : examCoordinatorUsers

  const displayRole = activeTab === 'faculty'
    ? 'Faculty'
    : activeTab === 'student'
      ? 'Student'
      : activeTab === 'incharge'
        ? 'Campus Incharge'
        : activeTab === 'placement'
          ? 'Placement Cell'
          : 'Exam Coordinator'

  const detailsHeader = displayRole === 'Faculty'
    ? 'Subject'
    : displayRole === 'Student'
      ? 'Enrollment No'
      : displayRole === 'Campus Incharge'
        ? 'Incharge ID'
        : displayRole === 'Placement Cell'
          ? 'Placement ID'
          : 'Coordinator ID'

  return (
    <div className="admin-panel-card">
      <h3>Manage Users</h3>

      <div className="admin-switch" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={activeTab === 'faculty' ? 'active' : ''}
          onClick={() => setActiveTab('faculty')}
        >
          Faculty ({facultyUsers.length})
        </button>
        <button
          type="button"
          className={activeTab === 'student' ? 'active' : ''}
          onClick={() => setActiveTab('student')}
        >
          Students ({studentUsers.length})
        </button>
        <button
          type="button"
          className={activeTab === 'incharge' ? 'active' : ''}
          onClick={() => setActiveTab('incharge')}
        >
          Campus Incharge ({inchargeUsers.length})
        </button>
        <button
          type="button"
          className={activeTab === 'placement' ? 'active' : ''}
          onClick={() => setActiveTab('placement')}
        >
          Placement Cell ({placementUsers.length})
        </button>
        <button
          type="button"
          className={activeTab === 'examCoordinator' ? 'active' : ''}
          onClick={() => setActiveTab('examCoordinator')}
        >
          Exam Coordinator ({examCoordinatorUsers.length})
        </button>
      </div>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>{detailsHeader}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.length === 0 ? (
              <tr>
                <td colSpan="5">No {displayRole.toLowerCase()}s added yet.</td>
              </tr>
            ) : (
              displayUsers.map((user) => (
                <tr key={`${user.role}-${user.id}`}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.department || 'N/A'}</td>
                  <td>
                    {displayRole === 'Faculty'
                      ? user.subject || 'N/A'
                      : displayRole === 'Student'
                        ? user.enrollmentNumber || 'N/A'
                        : displayRole === 'Campus Incharge'
                          ? user.inchargeId || user.id || 'N/A'
                          : displayRole === 'Placement Cell'
                            ? user.placementId || user.id || 'N/A'
                            : user.examCoordinatorId || user.id || 'N/A'}
                  </td>
                  <td className="table-actions">
                    <button type="button" onClick={() => onEditUser(displayRole, user.id)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeleteUser(displayRole, user.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageUsersTable
