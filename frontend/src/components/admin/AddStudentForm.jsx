function AddStudentForm({
  studentName,
  setStudentName,
  studentId,
  setStudentId,
  studentPassword,
  setStudentPassword,
  onSubmit,
}) {
  return (
    <div className="admin-panel-card">
      <h3>Add Student</h3>
      <form className="auth-form" onSubmit={onSubmit}>
        <label htmlFor="student-name">Full Name</label>
        <input
          id="student-name"
          type="text"
          value={studentName}
          onChange={(event) => setStudentName(event.target.value)}
          placeholder="Enter student name"
          required
        />

        <label htmlFor="student-id">Enrollment Number</label>
        <input
          id="student-id"
          type="text"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          placeholder="Enter enrollment number"
          required
        />

        <label htmlFor="student-password">Password</label>
        <input
          id="student-password"
          type="password"
          value={studentPassword}
          onChange={(event) => setStudentPassword(event.target.value)}
          placeholder="Set password"
          required
        />

        <button type="submit" className="submit-btn">
          Create Student
        </button>
      </form>
    </div>
  )
}

export default AddStudentForm
