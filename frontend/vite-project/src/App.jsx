import { useState, useEffect } from "react"
import Dashboard from "./pages/Dashboard"
import AOIManager from "./pages/AOIManager"
import AlertsPage from "./pages/AlertsPage"
import HistoryPage from "./pages/HistoryPage"
import LoginPage from "./login/LoginPage"
import RegisterPage from "./login/RegisterPage"

function App() {
  const pathname = window.location.pathname.toLowerCase()
  const isLoginRoute = pathname === "/login" || pathname === "/login/"
  const isRegisterRoute = pathname === "/register" || pathname === "/register/"
  const isAlertsRoute = pathname === "/alerts" || pathname === "/alerts/"
  const isHistoryRoute = pathname === "/history" || pathname === "/history/"
  const isAOIManagerRoute = pathname === "/aois" || pathname === "/aois/"

  // Check if user is authenticated
  const token = localStorage.getItem("token")
  const isAuthenticated = !!token

  // Always allow login and register pages
  if (isLoginRoute) return <LoginPage />
  if (isRegisterRoute) return <RegisterPage />

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    window.location.href = "/login"
    return null
  }

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("detectionState")
    window.location.href = "/login"
  }

  // Alerts page
  if (isAlertsRoute) return <AlertsPage onLogout={handleLogout} />

  // History page
  if (isAOIManagerRoute) return <AOIManager onLogout={handleLogout} />

  if (isHistoryRoute) return <HistoryPage onLogout={handleLogout} />

  const loadStoredState = () => {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem("detectionState")
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const stored = loadStoredState()

  const [aoi, setAoi] = useState(stored?.aoi ?? null)
  const [dates, setDates] = useState(stored?.dates ?? { past: null, current: null })
  const [result, setResult] = useState(stored?.result ?? null)

  // 4) UI states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Persist detection state so navigation/back/refresh keeps the same screen
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(
      "detectionState",
      JSON.stringify({
        aoi,
        dates,
        result
      })
    )
  }, [aoi, dates, result])

  return (
    <Dashboard
      aoi={aoi}
      setAoi={setAoi}
      dates={dates}
      setDates={setDates}
      result={result}
      loading={loading}
      error={error}
      setResult={setResult}
      setLoading={setLoading}
      setError={setError}
      onLogout={handleLogout}
    />
  )
}

export default App
