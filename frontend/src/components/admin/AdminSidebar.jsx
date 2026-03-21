function AdminSidebar({ activeAdminPage, setActiveAdminPage, pendingRequestsCount, onLogout }) {
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
        className={activeAdminPage === 'campusIncharge' ? 'active' : ''}
        onClick={() => setActiveAdminPage('campusIncharge')}
      >
        Add Campus Incharge
      </button>
      <button
        type="button"
        className={activeAdminPage === 'placementCell' ? 'active' : ''}
        onClick={() => setActiveAdminPage('placementCell')}
      >
        Add Placement Cell
      </button>
      <button
        type="button"
        className={activeAdminPage === 'examCoordinator' ? 'active' : ''}
        onClick={() => setActiveAdminPage('examCoordinator')}
      >
        Add Exam Coordinator
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
      <button
        type="button"
        className={activeAdminPage === 'classTeacher' ? 'active' : ''}
        onClick={() => setActiveAdminPage('classTeacher')}
      >
        Assign Class Teacher
      </button>
      <button
        type="button"
        className={activeAdminPage === 'studentDivision' ? 'active' : ''}
        onClick={() => setActiveAdminPage('studentDivision')}
      >
        Assign Division
      </button>
      <button
        type="button"
        className={activeAdminPage === 'requests' ? 'active' : ''}
        onClick={() => setActiveAdminPage('requests')}
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
