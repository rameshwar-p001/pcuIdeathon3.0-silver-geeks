function AddFacultyForm({
  facultyName,
  setFacultyName,
  facultyId,
  setFacultyId,
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

        <label htmlFor="faculty-id">Faculty ID</label>
        <input
          id="faculty-id"
          type="text"
          value={facultyId}
          onChange={(event) => setFacultyId(event.target.value)}
          placeholder="Enter faculty id"
          required
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
