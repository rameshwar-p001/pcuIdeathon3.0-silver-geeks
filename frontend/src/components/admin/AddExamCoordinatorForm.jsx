function AddExamCoordinatorForm({
  examCoordinatorName,
  setExamCoordinatorName,
  examCoordinatorEmail,
  setExamCoordinatorEmail,
  examCoordinatorId,
  setExamCoordinatorId,
  examCoordinatorDepartment,
  setExamCoordinatorDepartment,
  examCoordinatorPhone,
  setExamCoordinatorPhone,
  examCoordinatorPassword,
  setExamCoordinatorPassword,
  onSubmit,
}) {
  return (
    <div className="admin-panel-card">
      <h3>Add Exam Coordinator</h3>
      <form className="auth-form" onSubmit={onSubmit}>
        <label htmlFor="exam-coordinator-name">Full Name</label>
        <input
          id="exam-coordinator-name"
          type="text"
          value={examCoordinatorName}
          onChange={(event) => setExamCoordinatorName(event.target.value)}
          placeholder="Enter exam coordinator name"
          required
        />

        <label htmlFor="exam-coordinator-email">Email</label>
        <input
          id="exam-coordinator-email"
          type="email"
          value={examCoordinatorEmail}
          onChange={(event) => setExamCoordinatorEmail(event.target.value)}
          placeholder="Enter exam coordinator email"
          required
        />

        <label htmlFor="exam-coordinator-id">Coordinator ID</label>
        <input
          id="exam-coordinator-id"
          type="text"
          value={examCoordinatorId}
          onChange={(event) => setExamCoordinatorId(event.target.value)}
          placeholder="Enter exam coordinator id"
          required
        />

        <label htmlFor="exam-coordinator-department">Department</label>
        <input
          id="exam-coordinator-department"
          type="text"
          value={examCoordinatorDepartment}
          onChange={(event) => setExamCoordinatorDepartment(event.target.value)}
          placeholder="Enter department"
          required
        />

        <label htmlFor="exam-coordinator-phone">Phone</label>
        <input
          id="exam-coordinator-phone"
          type="tel"
          value={examCoordinatorPhone}
          onChange={(event) => setExamCoordinatorPhone(event.target.value)}
          placeholder="Enter phone (optional)"
        />

        <label htmlFor="exam-coordinator-password">Password</label>
        <input
          id="exam-coordinator-password"
          type="password"
          value={examCoordinatorPassword}
          onChange={(event) => setExamCoordinatorPassword(event.target.value)}
          placeholder="Set password"
          required
        />

        <button type="submit" className="submit-btn">
          Add Exam Coordinator
        </button>
      </form>
    </div>
  )
}

export default AddExamCoordinatorForm
