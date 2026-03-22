import PasswordEyeIcon from './PasswordEyeIcon'

function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  showPassword,
  setShowPassword,
  errorMessage,
  successMessage,
  onForgotPassword,
  onSubmit,
}) {
  return (
    <div className="auth-card">
      <div className="auth-headline">
        <h2>Campus Login</h2>
        <p>Sign in to access your Smart Campus workspace.</p>
      </div>

      {errorMessage && (
        <p className="field-error" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="field-success" role="status">
          {successMessage}
        </p>
      )}

      <form className="auth-form" onSubmit={onSubmit}>
        <label htmlFor="email">Email or ID</label>
        <input
          id="email"
          type="text"
          placeholder="name@campus.local or user ID"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
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
          <button type="button" className="forgot-btn" onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>

        <button type="submit" className="submit-btn">
          Login
        </button>

        <p className="login-security-note">Your session is encrypted and protected.</p>
      </form>
    </div>
  )
}

export default LoginForm
