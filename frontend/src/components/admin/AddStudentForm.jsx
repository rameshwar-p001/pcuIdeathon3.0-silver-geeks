function AddStudentForm({
  classOptions,
  studentName,
  setStudentName,
  studentEmail,
  setStudentEmail,
  studentEnrollmentNumber,
  setStudentEnrollmentNumber,
  studentClassId,
  setStudentClassId,
  studentDepartment,
  setStudentDepartment,
  studentSemester,
  setStudentSemester,
  studentPhone,
  setStudentPhone,
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

        <label htmlFor="student-email">Email</label>
        <input
          id="student-email"
          type="email"
          value={studentEmail}
          onChange={(event) => setStudentEmail(event.target.value)}
          placeholder="Enter student email"
          required
        />

        <label htmlFor="student-enrollment">Enrollment Number</label>
        <input
          id="student-enrollment"
          type="text"
          value={studentEnrollmentNumber}
          onChange={(event) => setStudentEnrollmentNumber(event.target.value)}
          placeholder="Enter enrollment number"
          required
        />

        <label htmlFor="student-class">Class</label>
        <select
          id="student-class"
          value={studentClassId}
          onChange={(event) => setStudentClassId(event.target.value)}
          required
        >
          <option value="">Choose class</option>
          {classOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="student-department">Department</label>
        <input
          id="student-department"
          type="text"
          value={studentDepartment}
          onChange={(event) => setStudentDepartment(event.target.value)}
          placeholder="Enter department"
          required
        />

        <label htmlFor="student-semester">Semester</label>
        <input
          id="student-semester"
          type="number"
          min="1"
          value={studentSemester}
          onChange={(event) => setStudentSemester(event.target.value)}
          placeholder="Enter semester"
          required
        />

        <label htmlFor="student-phone">Phone</label>
        <input
          id="student-phone"
          type="tel"
          value={studentPhone}
          onChange={(event) => setStudentPhone(event.target.value)}
          placeholder="Enter phone (optional)"
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
