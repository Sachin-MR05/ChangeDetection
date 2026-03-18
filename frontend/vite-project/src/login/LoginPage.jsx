import { useState } from "react"
import "./LoginPage.css"
import projectVideo from "../../../assert/Video Project.mp4"
import logo from "../assets/terraguard-logo.svg"
import { loginUser } from "../services/api"

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg("");

    const result = await loginUser({ email, password });

    if (result.success) {
      // Store token and redirect to dashboard
      localStorage.setItem("token", result.token);
      window.location.href = "/";
    } else {
      setErrorMsg(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <video
        className="login-video"
        autoPlay
        loop
        muted
        playsInline
        src={projectVideo}
      />

      <div className="login-overlay" />

      <div className="login-container">

        {/* Brand Header */}
        <div className="login-brand">
          <img src={logo} alt="TerraGuard Analytics" className="brand-logo" />
          <div className="brand-text">
            <h1>TerraGuard Analytics</h1>
            <p>Advanced Change Detection Platform</p>
          </div>
        </div>

        <h2>Login</h2>

        {errorMsg && <div className="auth-error" style={{color: '#ff4444', marginBottom: '10px', fontSize: '0.9rem'}}>{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div className="form-actions">
            <label className="remember-wrap">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="forgot-link">Forgot Password?</a>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="divider"><span>OR</span></div>

          <button type="button" className="google-btn">
            <svg className="google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="register-link">
            Don't have an account? <a href="/register">Register</a>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage