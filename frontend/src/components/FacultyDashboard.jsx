function FacultyDashboard({ user, onLogout }) {
  return (
    <div className="auth-card dashboard-card">
      <div className="admin-topbar">
        <h2>Faculty Dashboard</h2>
        <button type="button" className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <p className="dashboard-welcome">Welcome, {user?.name}</p>

      <div className="dashboard-grid">
        <article>
          <h3>Faculty ID</h3>
          <p>{user?.id}</p>
        </article>
        <article>
          <h3>Today's Classes</h3>
          <p>3 Scheduled</p>
        </article>
        <article>
          <h3>Pending Evaluations</h3>
          <p>12</p>
        </article>
        <article>
          <h3>Messages</h3>
          <p>5 Unread</p>
        </article>
      </div>
    </div>
  )
}

export default FacultyDashboard
