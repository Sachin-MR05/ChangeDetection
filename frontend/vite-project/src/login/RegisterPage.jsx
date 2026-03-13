import { useState } from "react"
import "./LoginPage.css" // Re-using the same CSS for identical aesthetic
import projectVideo from "../../../assert/Video Project.mp4"
import logo from "../assets/terraguard-logo.svg"
import { registerUser } from "../services/api"

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");
    
    const result = await registerUser({ email, password });
    
    if (result.success) {
      // Store token and redirect
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

        <h2>Register</h2>

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

          <div className="input-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <button type="submit" className="login-btn" style={{marginTop: '16px'}} disabled={loading}>
            {loading ? "Registering..." : "Create Account"}
          </button>
          
          <div className="register-link">
            Already have an account? <a href="/login">Login</a>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
