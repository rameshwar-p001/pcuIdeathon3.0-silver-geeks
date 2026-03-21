function AddFacultyForm({
  facultyName,
  setFacultyName,
  facultyEmail,
  setFacultyEmail,
  facultyMemberId,
  setFacultyMemberId,
  facultyDepartment,
  setFacultyDepartment,
  facultySubject,
  setFacultySubject,
  facultyPhone,
  setFacultyPhone,
  facultyPassword,
  setFacultyPassword,
  onSubmit,
}) {
  return (
    <div className="admin-panel-card">
      <h3>Add Faculty</h3>
      <form className="auth-form" onSubmit={onSubmit}>
        <label htmlFor="faculty-name">Full Name</label>
        <input
          id="faculty-name"
          type="text"
          value={facultyName}
          onChange={(event) => setFacultyName(event.target.value)}
          placeholder="Enter faculty name"
          required
        />

        <label htmlFor="faculty-email">Email</label>
        <input
          id="faculty-email"
          type="email"
          value={facultyEmail}
          onChange={(event) => setFacultyEmail(event.target.value)}
          placeholder="Enter faculty email"
          required
        />

        <label htmlFor="faculty-id">Faculty ID</label>
        <input
          id="faculty-id"
          type="text"
          value={facultyMemberId}
          onChange={(event) => setFacultyMemberId(event.target.value)}
          placeholder="Enter faculty id"
          required
        />

        <label htmlFor="faculty-department">Department</label>
        <input
          id="faculty-department"
          type="text"
          value={facultyDepartment}
          onChange={(event) => setFacultyDepartment(event.target.value)}
          placeholder="Enter department"
          required
        />

        <label htmlFor="faculty-subject">Subject</label>
        <input
          id="faculty-subject"
          type="text"
          value={facultySubject}
          onChange={(event) => setFacultySubject(event.target.value)}
          placeholder="Enter subject"
        />

        <label htmlFor="faculty-phone">Phone</label>
        <input
          id="faculty-phone"
          type="tel"
          value={facultyPhone}
          onChange={(event) => setFacultyPhone(event.target.value)}
          placeholder="Enter phone (optional)"
        />

        <label htmlFor="faculty-password">Password</label>
        <input
          id="faculty-password"
          type="password"
          value={facultyPassword}
          onChange={(event) => setFacultyPassword(event.target.value)}
          placeholder="Set password"
          required
        />

        <button type="submit" className="submit-btn">
          Add Faculty
        </button>
      </form>
    </div>
  )
}

export default AddFacultyForm
