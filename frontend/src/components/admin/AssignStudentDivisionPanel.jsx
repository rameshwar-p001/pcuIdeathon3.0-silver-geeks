import { useState } from 'react'

function AssignStudentDivisionPanel({
  students,
  classOptions,
  classTeacherAssignments,
  onAssignDivision,
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const normalizeClassId = (value) => String(value || '').trim().toLowerCase()
  const getClassLabel = (classId) => {
    const normalized = normalizeClassId(classId)
    const match = classOptions.find((item) => normalizeClassId(item.id) === normalized)
    return match?.label || normalized.toUpperCase() || 'N/A'
  }

  const assignedClassIds = new Set(
    (classTeacherAssignments || [])
      .map((item) => normalizeClassId(item.classId || item.class_id || item.id))
      .filter(Boolean),
  )

  const availableClassOptions = classOptions.filter((item) =>
    assignedClassIds.has(normalizeClassId(item.id)),
  )

  const selectedStudent = students.find((student) => (student.uid || student.id) === selectedStudentId)
  const selectedClass = availableClassOptions.find(
    (item) => normalizeClassId(item.id) === normalizeClassId(selectedClassId),
  )

  const handleAssignDivision = async (event) => {
    event.preventDefault()
    setAssignmentMessage('')
    setAssignmentError('')

    if (!selectedStudentId || !selectedClassId) {
      setAssignmentError('Please select both a student and a class.')
      return
    }

    setIsSubmitting(true)

    try {
      await onAssignDivision(selectedStudentId, normalizeClassId(selectedClassId))
      setAssignmentMessage(
        `${selectedStudent?.name || 'Student'} assigned to ${selectedClass?.label || getClassLabel(selectedClassId)} successfully.`,
      )
      setSelectedStudentId('')
      setSelectedClassId('')
    } catch (error) {
      setAssignmentError(error.message || 'Failed to assign student to division.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-panel-card">
      <h3>Assign Student Division</h3>
      <p className="login-hint">Assign students to their class/division to enable personalized timetable view</p>

      <form className="auth-form" onSubmit={handleAssignDivision}>
        <label htmlFor="student-select">Select Student</label>
        <select
          id="student-select"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
          required
        >
          <option value="">Choose a student</option>
          {students.map((student) => (
            <option key={student.uid || student.id} value={student.uid || student.id}>
              {student.name} ({student.email || 'N/A'})
            </option>
          ))}
        </select>

        <label htmlFor="class-select">Select Division/Class</label>
        <select
          id="class-select"
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          required
        >
          <option value="">Choose a division with assigned class teacher</option>
          {availableClassOptions.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.label}
            </option>
          ))}
        </select>

        {availableClassOptions.length === 0 && (
          <p className="field-error" role="alert">
            No divisions available. Please assign class teacher first.
          </p>
        )}

        {assignmentError && (
          <p className="field-error" role="alert">
            {assignmentError}
          </p>
        )}

        {assignmentMessage && (
          <p className="field-success" role="status">
            {assignmentMessage}
          </p>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting || !students.length || !availableClassOptions.length}
        >
          {isSubmitting ? 'Assigning...' : 'Assign Division'}
        </button>
      </form>

      <div className="users-table-wrap" style={{ marginTop: '24px' }}>
        <h4>Student Division Assignments</h4>
        <table className="users-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Email</th>
              <th>Assigned Division</th>
              <th>Enrollment No</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="4">No students available.</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.uid || student.id}>
                  <td>{student.name}</td>
                  <td>{student.email || 'N/A'}</td>
                  <td>
                    {student.class_id || student.classId ? (
                      <span className="status-pill ok">
                        {getClassLabel(student.class_id || student.classId)}
                      </span>
                    ) : (
                      <span className="status-pill danger">Not Assigned</span>
                    )}
                  </td>
                  <td>{student.enrollmentNumber || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AssignStudentDivisionPanel
