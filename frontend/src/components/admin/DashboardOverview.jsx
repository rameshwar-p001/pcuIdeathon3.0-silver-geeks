function DashboardOverview({ studentsCount, facultiesCount }) {
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
        <h3>Active Users</h3>
        <p>{studentsCount + facultiesCount}</p>
      </article>
      <article>
        <h3>Attendance Status</h3>
        <p>Updated</p>
      </article>
    </div>
  )
}

export default DashboardOverview
