import React, { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup, onAuthStateChanged } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { initConfig, getConfig, getAllAssets, getCalendarDays } from "./services/db";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CalendarView from "./pages/CalendarView";
import Warehouse from "./pages/Warehouse";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import LinkInBio from "./pages/LinkInBio";
import RulesView from "./pages/RulesView";

import { Sparkles, Key, Mail, Lock, AlertCircle } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Database states
  const [config, setConfig] = useState(null);
  const [assets, setAssets] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);

  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Fetch config & assets on login
        await fetchData();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // 1. Init / get config
      const conf = await initConfig();
      setConfig(conf);

      // 2. Get assets
      const allAssets = await getAllAssets();
      setAssets(allAssets);

      // 3. Get calendar days
      const days = await getCalendarDays();
      setCalendarDays(days);
    } catch (err) {
      console.error("Error loading application data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Auth failed:", err);
      setAuthError(err.message);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!email || !password) return;
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Email auth failed:", err);
      setAuthError(err.message.replace("Firebase: ", ""));
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-app)", fontFamily: "var(--font-sans)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: "4px solid var(--border-color)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem auto" }}></div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Connecting to Authenticator...</div>
        </div>
      </div>
    );
  }

  // Login / Registration Screen
  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a", // sleek dark blue-slate background
          fontFamily: "var(--font-sans)",
          padding: "1rem"
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "400px",
            backgroundColor: "#1e293b",
            borderColor: "#334155",
            color: "#f8fafc",
            padding: "2rem",
            boxShadow: "var(--shadow-lg)"
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "var(--accent)",
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1.75rem",
                marginBottom: "0.5rem",
                fontFamily: "var(--font-title)"
              }}
            >
              V
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>The Silent Veto</h2>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", marginTop: "0.25rem" }}>
              Content Distribution Center
            </span>
          </div>

          {authError && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                padding: "0.75rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                marginBottom: "1rem",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "10px", top: "12px", color: "#64748b" }} />
              <input
                type="email"
                className="input-field"
                placeholder="Email Address"
                style={{ paddingLeft: "36px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff" }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "10px", top: "12px", color: "#64748b" }} />
              <input
                type="password"
                className="input-field"
                placeholder="Password"
                style={{ paddingLeft: "36px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#fff" }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.75rem", fontWeight: 600 }}
            >
              {isSignUp ? "Create Admin Account" : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", margin: "1.5rem 0", color: "#475569", fontSize: "0.75rem" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#334155" }}></div>
            <span style={{ padding: "0 0.5rem", textTransform: "uppercase" }}>or</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#334155" }}></div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="btn btn-secondary"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontWeight: 500,
              backgroundColor: "transparent",
              color: "#cbd5e1",
              borderColor: "#334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.77 2.15c1.62-1.49 2.82-3.69 2.82-6.48z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.77-2.15c-.77.52-1.75.83-2.77.83-2.34 0-4.31-1.58-5.02-3.7L1.63 12.9C3.12 15.86 6.18 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.98 10.8a5.4 5.4 0 0 1 0-3.6L1.63 5.3c-.8 1.6-1.63 3.52-1.63 5.5s.83 3.9 1.63 5.5l2.35-1.9z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 6.18 0 3.12 2.14 1.63 5.1L3.98 7c.71-2.12 2.68-3.7 5.02-3.7z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "#94a3b8" }}>
            {isSignUp ? "Already have an account?" : "Need to register?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Authenticated Dashboard Shell
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user}>
      {dataLoading && !config ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem auto" }}></div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Synchronizing Warehouse Data...</div>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && (
            <Dashboard
              assets={assets}
              calendarDays={calendarDays}
              onRefresh={fetchData}
              config={config}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              assets={assets}
              calendarDays={calendarDays}
              onRefresh={fetchData}
              config={config}
            />
          )}

          {activeTab === "warehouse" && (
            <Warehouse
              assets={assets}
              onRefresh={fetchData}
              config={config}
            />
          )}

          {activeTab === "rules" && (
            <RulesView
              config={config}
            />
          )}

          {activeTab === "analytics" && (
            <Analytics
              assets={assets}
              calendarDays={calendarDays}
            />
          )}

          {activeTab === "settings" && (
            <Settings
              config={config}
              onRefresh={fetchData}
            />
          )}

          {activeTab === "links" && (
            <LinkInBio />
          )}
        </>
      )}
    </Layout>
  );
}
