function AddPlacementCellForm({
  placementName,
  setPlacementName,
  placementEmail,
  setPlacementEmail,
  placementId,
  setPlacementId,
  placementDepartment,
  setPlacementDepartment,
  placementPhone,
  setPlacementPhone,
  placementPassword,
  setPlacementPassword,
  onSubmit,
}) {
  return (
    <div className="admin-panel-card">
      <h3>Add Placement Cell</h3>
      <form className="auth-form" onSubmit={onSubmit}>
        <label htmlFor="placement-name">Full Name</label>
        <input
          id="placement-name"
          type="text"
          value={placementName}
          onChange={(event) => setPlacementName(event.target.value)}
          placeholder="Enter placement cell officer name"
          required
        />

        <label htmlFor="placement-email">Email</label>
        <input
          id="placement-email"
          type="email"
          value={placementEmail}
          onChange={(event) => setPlacementEmail(event.target.value)}
          placeholder="Enter placement cell email"
          required
        />

        <label htmlFor="placement-id">Placement Cell ID</label>
        <input
          id="placement-id"
          type="text"
          value={placementId}
          onChange={(event) => setPlacementId(event.target.value)}
          placeholder="Enter placement cell id"
          required
        />

        <label htmlFor="placement-department">Department</label>
        <input
          id="placement-department"
          type="text"
          value={placementDepartment}
          onChange={(event) => setPlacementDepartment(event.target.value)}
          placeholder="Enter department"
          required
        />

        <label htmlFor="placement-phone">Phone</label>
        <input
          id="placement-phone"
          type="tel"
          value={placementPhone}
          onChange={(event) => setPlacementPhone(event.target.value)}
          placeholder="Enter phone (optional)"
        />

        <label htmlFor="placement-password">Password</label>
        <input
          id="placement-password"
          type="password"
          value={placementPassword}
          onChange={(event) => setPlacementPassword(event.target.value)}
          placeholder="Set password"
          required
        />

        <button type="submit" className="submit-btn">
          Add Placement Cell
        </button>
      </form>
    </div>
  )
}

export default AddPlacementCellForm
