function AdminTopbar({ adminName }) {
  return (
    <header className="admin-navbar">
      <h2>Smart Campus AI</h2>
      <p>{adminName}</p>
    </header>
  )
}

export default AdminTopbar
