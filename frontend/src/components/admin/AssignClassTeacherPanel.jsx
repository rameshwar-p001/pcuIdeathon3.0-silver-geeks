function AssignClassTeacherPanel({
  classes,
  faculties,
  assignments,
  selectedClassId,
  setSelectedClassId,
  selectedFacultyUid,
  setSelectedFacultyUid,
  onAssign,
}) {
  const selectedClass = classes.find((item) => item.id === selectedClassId)

  return (
    <div className="admin-panel-card">
      <h3>Assign Class Teacher</h3>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault()
          onAssign(selectedClassId, selectedFacultyUid)
        }}
      >
        <label htmlFor="class-id">Select Class</label>
        <select
          id="class-id"
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          required
        >
          <option value="">Choose class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="faculty-uid">Select Faculty</label>
        <select
          id="faculty-uid"
          value={selectedFacultyUid}
          onChange={(event) => setSelectedFacultyUid(event.target.value)}
          required
        >
          <option value="">Choose faculty</option>
          {faculties.map((faculty) => (
            <option key={faculty.uid} value={faculty.uid}>
              {faculty.name} ({faculty.email})
            </option>
          ))}
        </select>

        <button type="submit" className="submit-btn" disabled={!faculties.length}>
          {selectedClass && assignments.some((item) => item.classId === selectedClass.id)
            ? 'Change Teacher'
            : 'Assign Teacher'}
        </button>
      </form>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Assigned Faculty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => {
              const assigned = assignments.find((row) => row.classId === item.id)

              return (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td>{assigned ? assigned.facultyName : 'Not assigned'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassId(item.id)
                        setSelectedFacultyUid(assigned?.facultyUid || '')
                      }}
                    >
                      {assigned ? 'Change' : 'Assign'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AssignClassTeacherPanel
