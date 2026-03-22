function AdminSidebar({
  activeAdminPage,
  setActiveAdminPage,
  pendingRequestsCount,
  onLogout,
  onNavigate,
}) {
  const handleNavigate = (page) => {
    setActiveAdminPage(page)
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <aside className="admin-sidebar">
      <h3>ERP Admin</h3>
      <button
        type="button"
        className={activeAdminPage === 'dashboard' ? 'active' : ''}
        onClick={() => handleNavigate('dashboard')}
      >
        Dashboard
      </button>
      <button
        type="button"
        className={activeAdminPage === 'student' ? 'active' : ''}
        onClick={() => handleNavigate('student')}
      >
        Add Student
      </button>
      <button
        type="button"
        className={activeAdminPage === 'faculty' ? 'active' : ''}
        onClick={() => handleNavigate('faculty')}
      >
        Add Faculty
      </button>
      <button
        type="button"
        className={activeAdminPage === 'campusIncharge' ? 'active' : ''}
        onClick={() => handleNavigate('campusIncharge')}
      >
        Add Campus Incharge
      </button>
      <button
        type="button"
        className={activeAdminPage === 'placementCell' ? 'active' : ''}
        onClick={() => handleNavigate('placementCell')}
      >
        Add Placement Cell
      </button>
      <button
        type="button"
        className={activeAdminPage === 'examCoordinator' ? 'active' : ''}
        onClick={() => handleNavigate('examCoordinator')}
      >
        Add Exam Coordinator
      </button>
      <button
        type="button"
        className={activeAdminPage === 'users' ? 'active' : ''}
        onClick={() => handleNavigate('users')}
      >
        Manage Users
      </button>
      <button
        type="button"
        className={activeAdminPage === 'attendance' ? 'active' : ''}
        onClick={() => handleNavigate('attendance')}
      >
        Attendance
      </button>
      <button
        type="button"
        className={activeAdminPage === 'classTeacher' ? 'active' : ''}
        onClick={() => handleNavigate('classTeacher')}
      >
        Assign Class Teacher
      </button>
      <button
        type="button"
        className={activeAdminPage === 'studentDivision' ? 'active' : ''}
        onClick={() => handleNavigate('studentDivision')}
      >
        Assign Division
      </button>
      <button
        type="button"
        className={activeAdminPage === 'requests' ? 'active' : ''}
        onClick={() => handleNavigate('requests')}
      >
        Profile Requests{pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ''}
      </button>
      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </aside>
  )
}

export default AdminSidebar
