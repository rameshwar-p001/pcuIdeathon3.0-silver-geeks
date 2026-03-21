import AddFacultyForm from './AddFacultyForm'
import AddStudentForm from './AddStudentForm'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import AttendancePanel from './AttendancePanel'
import DashboardOverview from './DashboardOverview'
import ManageUsersTable from './ManageUsersTable'

function AdminDashboard({
  activeAdminPage,
  setActiveAdminPage,
  adminName,
  successMessage,
  onLogout,
  students,
  faculties,
  studentForm,
  facultyForm,
  onCreateStudent,
  onAddFaculty,
  onEditUser,
  onDeleteUser,
}) {
  const users = [
    ...students.map((student) => ({
      ...student,
      role: 'Student',
      email: `${student.id}@campus.local`,
      department: 'N/A',
    })),
    ...faculties.map((faculty) => ({
      ...faculty,
      role: 'Faculty',
      email: `${faculty.id}@campus.local`,
      department: 'N/A',
    })),
  ]

  return (
    <div className="admin-shell">
      <AdminSidebar
        activeAdminPage={activeAdminPage}
        setActiveAdminPage={setActiveAdminPage}
        onLogout={onLogout}
      />

      <section className="admin-main">
        <AdminTopbar adminName={adminName} />

        {successMessage && (
          <p className="field-success" role="status">
            {successMessage}
          </p>
        )}

        {activeAdminPage === 'dashboard' && (
          <DashboardOverview
            studentsCount={students.length}
            facultiesCount={faculties.length}
          />
        )}

        {activeAdminPage === 'student' && (
          <AddStudentForm
            studentName={studentForm.studentName}
            setStudentName={studentForm.setStudentName}
            studentId={studentForm.studentId}
            setStudentId={studentForm.setStudentId}
            studentPassword={studentForm.studentPassword}
            setStudentPassword={studentForm.setStudentPassword}
            onSubmit={onCreateStudent}
          />
        )}

        {activeAdminPage === 'faculty' && (
          <AddFacultyForm
            facultyName={facultyForm.facultyName}
            setFacultyName={facultyForm.setFacultyName}
            facultyId={facultyForm.facultyId}
            setFacultyId={facultyForm.setFacultyId}
            facultyPassword={facultyForm.facultyPassword}
            setFacultyPassword={facultyForm.setFacultyPassword}
            onSubmit={onAddFaculty}
          />
        )}

        {activeAdminPage === 'users' && (
          <ManageUsersTable
            users={users}
            onEditUser={onEditUser}
            onDeleteUser={onDeleteUser}
          />
        )}

        {activeAdminPage === 'attendance' && <AttendancePanel />}
      </section>
    </div>
  )
}

export default AdminDashboard
