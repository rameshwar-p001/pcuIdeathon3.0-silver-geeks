function AddCampusInchargeForm({
  inchargeName,
  setInchargeName,
  inchargeEmail,
  setInchargeEmail,
  inchargeId,
  setInchargeId,
  inchargeDepartment,
  setInchargeDepartment,
  inchargePhone,
  setInchargePhone,
  inchargePassword,
  setInchargePassword,
  onSubmit,
}) {
  return (
    <div className="admin-panel-card">
      <h3>Add Campus Incharge</h3>
      <form className="auth-form" onSubmit={onSubmit}>
        <label htmlFor="incharge-name">Full Name</label>
        <input
          id="incharge-name"
          type="text"
          value={inchargeName}
          onChange={(event) => setInchargeName(event.target.value)}
          placeholder="Enter incharge name"
          required
        />

        <label htmlFor="incharge-email">Email</label>
        <input
          id="incharge-email"
          type="email"
          value={inchargeEmail}
          onChange={(event) => setInchargeEmail(event.target.value)}
          placeholder="Enter incharge email"
          required
        />

        <label htmlFor="incharge-id">Campus Incharge ID</label>
        <input
          id="incharge-id"
          type="text"
          value={inchargeId}
          onChange={(event) => setInchargeId(event.target.value)}
          placeholder="Enter campus incharge id"
          required
        />

        <label htmlFor="incharge-department">Department</label>
        <input
          id="incharge-department"
          type="text"
          value={inchargeDepartment}
          onChange={(event) => setInchargeDepartment(event.target.value)}
          placeholder="Enter department"
          required
        />

        <label htmlFor="incharge-phone">Phone</label>
        <input
          id="incharge-phone"
          type="tel"
          value={inchargePhone}
          onChange={(event) => setInchargePhone(event.target.value)}
          placeholder="Enter phone (optional)"
        />

        <label htmlFor="incharge-password">Password</label>
        <input
          id="incharge-password"
          type="password"
          value={inchargePassword}
          onChange={(event) => setInchargePassword(event.target.value)}
          placeholder="Set password"
          required
        />

        <button type="submit" className="submit-btn">
          Add Campus Incharge
        </button>
      </form>
    </div>
  )
}

export default AddCampusInchargeForm
