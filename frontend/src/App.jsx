import { useMemo, useState } from 'react'
import './App.css'

function App() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isRegister = mode === 'register'
  const passwordsMatch = useMemo(() => {
    if (!isRegister) {
      return true
    }

    return password.length > 0 && password === confirmPassword
  }, [confirmPassword, isRegister, password])

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  const PasswordEyeIcon = ({ isOpen }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 5C6.5 5 2.2 8.5 1 12c1.2 3.5 5.5 7 11 7s9.8-3.5 11-7c-1.2-3.5-5.5-7-11-7Zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
      {!isOpen && (
        <path d="m4 4 16 16" stroke="currentColor" strokeWidth="2" />
      )}
    </svg>
  )

  return (
    <main className="auth-page">
      <section className="brand-panel" aria-label="Branding section">
        
        <h1>Campus Ai portal </h1>
        <p className="brand-copy">
          Securely access your classes, attendance, and student dashboard in one
          clean place.
        </p>
        <div className="brand-stats">
          <article>
            <h2>24/7</h2>
            <p>Access Anywhere</p>
          </article>
          <article>
            <h2>99.9%</h2>
            <p>Reliable Uptime</p>
          </article>
        </div>
      </section>

      <section className="form-panel" aria-label="Authentication form">
        <div className="auth-card">
          <div className="mode-switch" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              role="tab"
              className={mode === 'login' ? 'active' : ''}
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              className={mode === 'register' ? 'active' : ''}
              aria-selected={mode === 'register'}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <div className="auth-headline">
            <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {isRegister
                ? 'Start managing your campus journey today.'
                : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@college.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-visibility"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <PasswordEyeIcon isOpen={showPassword} />
              </button>
            </div>

            {isRegister && (
              <>
                <label htmlFor="confirm-password">Confirm Password</label>
                <div className="password-field">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    <PasswordEyeIcon isOpen={showConfirmPassword} />
                  </button>
                </div>
                {!passwordsMatch && (
                  <p className="field-error">Passwords do not match.</p>
                )}
              </>
            )}

            <div className="form-options">
              <label className="remember-me" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Remember me
              </label>
              <button type="button" className="forgot-btn">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isRegister && !passwordsMatch}
            >
              {isRegister ? 'Create Account' : 'Login'}
            </button>
          </form>

          <p className="auth-footer">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="text-toggle"
              onClick={() => setMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Login here' : 'Register now'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
