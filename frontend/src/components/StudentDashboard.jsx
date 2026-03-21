function StudentDashboard({ user, onLogout }) {
  return (
    <div className="auth-card dashboard-card">
      <div className="admin-topbar">
        <h2>Student Dashboard</h2>
        <button type="button" className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <p className="dashboard-welcome">Welcome, {user?.name}</p>

      <div className="dashboard-grid">
        <article>
          <h3>Student ID</h3>
          <p>{user?.id}</p>
        </article>
        <article>
          <h3>Attendance</h3>
          <p>92%</p>
        </article>
        <article>
          <h3>Assignments</h3>
          <p>4 Pending</p>
        </article>
        <article>
          <h3>Notices</h3>
          <p>2 New</p>
        </article>
      </div>
    </div>
  )
}

export default StudentDashboard
