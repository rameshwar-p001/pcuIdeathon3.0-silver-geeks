function PasswordEyeIcon({ isOpen }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 5C6.5 5 2.2 8.5 1 12c1.2 3.5 5.5 7 11 7s9.8-3.5 11-7c-1.2-3.5-5.5-7-11-7Zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
      {!isOpen && <path d="m4 4 16 16" stroke="currentColor" strokeWidth="2" />}
    </svg>
  )
}

export default PasswordEyeIcon
