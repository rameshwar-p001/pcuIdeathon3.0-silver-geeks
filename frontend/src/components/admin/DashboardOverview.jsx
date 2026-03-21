function DashboardOverview({ studentsCount, facultiesCount, campusInchargeCount, placementCellCount, examCoordinatorCount }) {
  const inchargeCount = Number(campusInchargeCount) || 0
  const placementCount = Number(placementCellCount) || 0
  const coordinatorCount = Number(examCoordinatorCount) || 0

  return (
    <div className="dashboard-grid">
      <article>
        <h3>Total Students</h3>
        <p>{studentsCount}</p>
      </article>
      <article>
        <h3>Total Faculty</h3>
        <p>{facultiesCount}</p>
      </article>
      <article>
        <h3>Campus Incharge</h3>
        <p>{inchargeCount}</p>
      </article>
      <article>
        <h3>Placement Cell</h3>
        <p>{placementCount}</p>
      </article>
      <article>
        <h3>Exam Coordinator</h3>
        <p>{coordinatorCount}</p>
      </article>
      <article>
        <h3>Active Users</h3>
        <p>{studentsCount + facultiesCount + inchargeCount + placementCount + coordinatorCount}</p>
      </article>
    </div>
  )
}

export default DashboardOverview
