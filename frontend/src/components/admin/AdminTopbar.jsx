function AdminTopbar({ adminName, onToggleSidebar }) {
  const avatarText = String(adminName || 'AD')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AD'

  return (
    <header className="admin-navbar">
      <button type="button" className="sidebar-toggle-btn" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
        Menu
      </button>

      <div className="admin-navbar-main">
        <h2>Smart Campus <span className="erp-accent">ERP</span></h2>
      </div>

      <div className="admin-navbar-search">
        <input type="search" placeholder="Search" aria-label="Search" />
      </div>

      <div className="admin-navbar-profile">
        <span className="admin-avatar" aria-hidden="true">{avatarText}</span>
        <p>{adminName}</p>
      </div>
    </header>
  )
}

export default AdminTopbar
