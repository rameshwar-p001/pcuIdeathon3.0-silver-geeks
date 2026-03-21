function ManageUsersTable({ users, onEditUser, onDeleteUser }) {
  return (
    <div className="admin-panel-card">
      <h3>Manage Users</h3>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5">No users added yet.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={`${user.role}-${user.id}`}>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>{user.email}</td>
                  <td>{user.department}</td>
                  <td className="table-actions">
                    <button type="button" onClick={() => onEditUser(user.role, user.id)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeleteUser(user.role, user.id)}>
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
