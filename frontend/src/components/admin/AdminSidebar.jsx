function AdminSidebar({ activeAdminPage, setActiveAdminPage, onLogout }) {
  return (
    <aside className="admin-sidebar">
      <h3>ERP Admin</h3>
      <button
        type="button"
        className={activeAdminPage === 'dashboard' ? 'active' : ''}
        onClick={() => setActiveAdminPage('dashboard')}
      >
        Dashboard
      </button>
      <button
        type="button"
        className={activeAdminPage === 'student' ? 'active' : ''}
        onClick={() => setActiveAdminPage('student')}
      >
        Add Student
      </button>
      <button
        type="button"
        className={activeAdminPage === 'faculty' ? 'active' : ''}
        onClick={() => setActiveAdminPage('faculty')}
      >
        Add Faculty
      </button>
      <button
        type="button"
        className={activeAdminPage === 'users' ? 'active' : ''}
        onClick={() => setActiveAdminPage('users')}
      >
        Manage Users
      </button>
      <button
        type="button"
        className={activeAdminPage === 'attendance' ? 'active' : ''}
        onClick={() => setActiveAdminPage('attendance')}
      >
        Attendance
      </button>
      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </aside>
  )
}

export default AdminSidebar
