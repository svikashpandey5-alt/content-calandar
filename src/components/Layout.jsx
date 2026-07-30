import React from "react";
import {
  LayoutDashboard,
  Calendar,
  Database,
  BarChart3,
  Settings,
  Link2,
  LogOut,
  Sparkles
} from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Layout({ children, activeTab, setActiveTab, user }) {
  const menuItems = [
    { id: "dashboard", label: "Today / Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar Schedule", icon: Calendar },
    { id: "warehouse", label: "Content Warehouse", icon: Database },
    { id: "analytics", label: "Analytics & Insights", icon: BarChart3 },
    { id: "settings", label: "Settings / Admin", icon: Settings },
    { id: "links", label: "Link-in-Bio Setup", icon: Link2 }
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Header Bar */}
      <header
        style={{
          backgroundColor: "var(--header-bg)",
          color: "var(--header-text)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "var(--shadow-md)",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "1.25rem",
              fontFamily: "var(--font-title)"
            }}
          >
            V
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", color: "#ffffff", margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>
              The Silent Veto
            </h1>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
              Content Scheduler & Distribution Center
            </span>
          </div>
        </div>

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#f8fafc" }}>
                {user.displayName || user.email}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Logged in
              </div>
            </div>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                style={{ width: "36px", height: "36px", borderRadius: "50%", border: "2px solid var(--accent)" }}
              />
            ) : (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "0.875rem"
                }}
              >
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                backgroundColor: "transparent",
                borderColor: "#475569",
                color: "#cbd5e1"
              }}
              title="Logout"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Layout Container */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Left Sidebar Menu */}
        <aside
          style={{
            width: "260px",
            backgroundColor: "var(--bg-sidebar)",
            borderRight: "1px solid var(--border-color)",
            padding: "1.5rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}
        >
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={isActive ? "sidebar-item active" : "sidebar-item"}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Body Area */}
        <main style={{ flex: 1, padding: "2rem", backgroundColor: "var(--bg-app)", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
