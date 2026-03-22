import { useState } from 'react'
import AddFacultyForm from './AddFacultyForm'
import AddCampusInchargeForm from './AddCampusInchargeForm'
import AddPlacementCellForm from './AddPlacementCellForm'
import AddExamCoordinatorForm from './AddExamCoordinatorForm'
import AddStudentForm from './AddStudentForm'
import AssignClassTeacherPanel from './AssignClassTeacherPanel'
import AssignStudentDivisionPanel from './AssignStudentDivisionPanel'
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
  errorMessage,
  onLogout,
  students,
  faculties,
  campusIncharges,
  placementCells,
  examCoordinators,
  studentForm,
  facultyForm,
  campusInchargeForm,
  placementCellForm,
  examCoordinatorForm,
  onCreateStudent,
  onAddFaculty,
  onAddCampusIncharge,
  onAddPlacementCell,
  onAddExamCoordinator,
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
  onAssignStudentDivision,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
    ...campusIncharges.map((incharge) => ({
      ...incharge,
      role: 'Campus Incharge',
      email: incharge.email || '',
      department: incharge.department || 'N/A',
    })),
    ...placementCells.map((placementCell) => ({
      ...placementCell,
      role: 'Placement Cell',
      email: placementCell.email || '',
      department: placementCell.department || 'N/A',
    })),
    ...examCoordinators.map((coordinator) => ({
      ...coordinator,
      role: 'Exam Coordinator',
      email: coordinator.email || '',
      department: coordinator.department || 'N/A',
    })),
  ]

  return (
    <div className={`admin-shell${isSidebarOpen ? ' sidebar-open' : ''}`}>
      <AdminSidebar
        activeAdminPage={activeAdminPage}
        setActiveAdminPage={setActiveAdminPage}
        pendingRequestsCount={
          profileChangeRequests.filter((request) => request.status === 'pending').length
        }
        onLogout={onLogout}
        onNavigate={() => setIsSidebarOpen(false)}
      />

      <button
        type="button"
        className="sidebar-overlay"
        aria-label="Close sidebar"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="admin-main">
        <AdminTopbar
          adminName={adminName}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {successMessage && (
          <p className="field-success" role="status">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="field-error" role="alert">
            {errorMessage}
          </p>
        )}

        {activeAdminPage === 'dashboard' && (
          <DashboardOverview
            studentsCount={students.length}
            facultiesCount={faculties.length}
            campusInchargeCount={campusIncharges.length}
            placementCellCount={placementCells.length}
            examCoordinatorCount={examCoordinators.length}
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

        {activeAdminPage === 'campusIncharge' && (
          <AddCampusInchargeForm
            inchargeName={campusInchargeForm.inchargeName}
            setInchargeName={campusInchargeForm.setInchargeName}
            inchargeEmail={campusInchargeForm.inchargeEmail}
            setInchargeEmail={campusInchargeForm.setInchargeEmail}
            inchargeId={campusInchargeForm.inchargeId}
            setInchargeId={campusInchargeForm.setInchargeId}
            inchargeDepartment={campusInchargeForm.inchargeDepartment}
            setInchargeDepartment={campusInchargeForm.setInchargeDepartment}
            inchargePhone={campusInchargeForm.inchargePhone}
            setInchargePhone={campusInchargeForm.setInchargePhone}
            inchargePassword={campusInchargeForm.inchargePassword}
            setInchargePassword={campusInchargeForm.setInchargePassword}
            onSubmit={onAddCampusIncharge}
          />
        )}

        {activeAdminPage === 'placementCell' && (
          <AddPlacementCellForm
            placementName={placementCellForm.placementName}
            setPlacementName={placementCellForm.setPlacementName}
            placementEmail={placementCellForm.placementEmail}
            setPlacementEmail={placementCellForm.setPlacementEmail}
            placementId={placementCellForm.placementId}
            setPlacementId={placementCellForm.setPlacementId}
            placementDepartment={placementCellForm.placementDepartment}
            setPlacementDepartment={placementCellForm.setPlacementDepartment}
            placementPhone={placementCellForm.placementPhone}
            setPlacementPhone={placementCellForm.setPlacementPhone}
            placementPassword={placementCellForm.placementPassword}
            setPlacementPassword={placementCellForm.setPlacementPassword}
            onSubmit={onAddPlacementCell}
          />
        )}

        {activeAdminPage === 'examCoordinator' && (
          <AddExamCoordinatorForm
            examCoordinatorName={examCoordinatorForm.examCoordinatorName}
            setExamCoordinatorName={examCoordinatorForm.setExamCoordinatorName}
            examCoordinatorEmail={examCoordinatorForm.examCoordinatorEmail}
            setExamCoordinatorEmail={examCoordinatorForm.setExamCoordinatorEmail}
            examCoordinatorId={examCoordinatorForm.examCoordinatorId}
            setExamCoordinatorId={examCoordinatorForm.setExamCoordinatorId}
            examCoordinatorDepartment={examCoordinatorForm.examCoordinatorDepartment}
            setExamCoordinatorDepartment={examCoordinatorForm.setExamCoordinatorDepartment}
            examCoordinatorPhone={examCoordinatorForm.examCoordinatorPhone}
            setExamCoordinatorPhone={examCoordinatorForm.setExamCoordinatorPhone}
            examCoordinatorPassword={examCoordinatorForm.examCoordinatorPassword}
            setExamCoordinatorPassword={examCoordinatorForm.setExamCoordinatorPassword}
            onSubmit={onAddExamCoordinator}
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

        {activeAdminPage === 'studentDivision' && (
          <AssignStudentDivisionPanel
            students={students}
            classOptions={classOptions}
            classTeacherAssignments={classTeacherAssignments}
            onAssignDivision={onAssignStudentDivision}
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
