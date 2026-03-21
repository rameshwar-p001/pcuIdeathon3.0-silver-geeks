import AddFacultyForm from './AddFacultyForm'
import AddStudentForm from './AddStudentForm'
import AssignClassTeacherPanel from './AssignClassTeacherPanel'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import AttendancePanel from './AttendancePanel'
import DashboardOverview from './DashboardOverview'
import ManageUsersTable from './ManageUsersTable'
import ProfileChangeRequestsPanel from './ProfileChangeRequestsPanel'

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
  profileChangeRequests,
  onApproveProfileChangeRequest,
  onRejectProfileChangeRequest,
  classOptions,
  classTeacherAssignments,
  selectedClassId,
  setSelectedClassId,
  selectedFacultyUid,
  setSelectedFacultyUid,
  onAssignClassTeacher,
}) {
  const users = [
    ...students.map((student) => ({
      ...student,
      role: 'Student',
      email: student.email || '',
      department: student.department || 'N/A',
    })),
    ...faculties.map((faculty) => ({
      ...faculty,
      role: 'Faculty',
      email: faculty.email || '',
      department: faculty.department || 'N/A',
    })),
  ]

  return (
    <div className="admin-shell">
      <AdminSidebar
        activeAdminPage={activeAdminPage}
        setActiveAdminPage={setActiveAdminPage}
        pendingRequestsCount={
          profileChangeRequests.filter((request) => request.status === 'pending').length
        }
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
            classOptions={classOptions}
            studentName={studentForm.studentName}
            setStudentName={studentForm.setStudentName}
            studentEmail={studentForm.studentEmail}
            setStudentEmail={studentForm.setStudentEmail}
            studentEnrollmentNumber={studentForm.studentEnrollmentNumber}
            setStudentEnrollmentNumber={studentForm.setStudentEnrollmentNumber}
            studentClassId={studentForm.studentClassId}
            setStudentClassId={studentForm.setStudentClassId}
            studentDepartment={studentForm.studentDepartment}
            setStudentDepartment={studentForm.setStudentDepartment}
            studentSemester={studentForm.studentSemester}
            setStudentSemester={studentForm.setStudentSemester}
            studentPhone={studentForm.studentPhone}
            setStudentPhone={studentForm.setStudentPhone}
            studentPassword={studentForm.studentPassword}
            setStudentPassword={studentForm.setStudentPassword}
            onSubmit={onCreateStudent}
          />
        )}

        {activeAdminPage === 'faculty' && (
          <AddFacultyForm
            facultyName={facultyForm.facultyName}
            setFacultyName={facultyForm.setFacultyName}
            facultyEmail={facultyForm.facultyEmail}
            setFacultyEmail={facultyForm.setFacultyEmail}
            facultyMemberId={facultyForm.facultyMemberId}
            setFacultyMemberId={facultyForm.setFacultyMemberId}
            facultyDepartment={facultyForm.facultyDepartment}
            setFacultyDepartment={facultyForm.setFacultyDepartment}
            facultySubject={facultyForm.facultySubject}
            setFacultySubject={facultyForm.setFacultySubject}
            facultyPhone={facultyForm.facultyPhone}
            setFacultyPhone={facultyForm.setFacultyPhone}
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

        {activeAdminPage === 'classTeacher' && (
          <AssignClassTeacherPanel
            classes={classOptions}
            faculties={faculties}
            assignments={classTeacherAssignments}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedFacultyUid={selectedFacultyUid}
            setSelectedFacultyUid={setSelectedFacultyUid}
            onAssign={onAssignClassTeacher}
          />
        )}

        {activeAdminPage === 'requests' && (
          <ProfileChangeRequestsPanel
            requests={profileChangeRequests}
            onApprove={onApproveProfileChangeRequest}
            onReject={onRejectProfileChangeRequest}
          />
        )}
      </section>
    </div>
  )
}

export default AdminDashboard
