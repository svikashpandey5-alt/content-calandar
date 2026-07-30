import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  BookOpen,
  Mail,
  Video,
  ShoppingBag,
  TrendingUp,
  Link as LinkIcon,
  MousePointerClick,
  Smartphone
} from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// Log click event helper
async function logLinkClick(linkId, url) {
  try {
    await addDoc(collection(db, "linkClicks"), {
      linkId,
      url,
      timestamp: new Date().toISOString(),
      utmSource: "linkinbio",
      utmMedium: "social",
      utmCampaign: "silent_veto_launch"
    });
  } catch (err) {
    console.error("Failed to log link click:", err);
  }
}

export default function LinkInBio() {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const links = [
    {
      id: "amazon_preorder",
      title: "Pre-order The Silent Veto on Amazon",
      url: "https://www.amazon.com/dp/sample-book-id",
      icon: ShoppingBag,
      color: "#FF9900"
    },
    {
      id: "vip_newsletter",
      title: "Join the VIP Reader Newsletter",
      url: "https://newsletter.esspressoshot.consulting/silentveto",
      icon: Mail,
      color: "#25D366"
    },
    {
      id: "trailer_video",
      title: "Watch the Official Book Trailer",
      url: "https://www.youtube.com/watch?v=sample",
      icon: Video,
      color: "#FF0000"
    },
    {
      id: "chapter1_preview",
      title: "Read Chapter 1 Preview (PDF)",
      url: "https://drive.google.com/file/d/sample-preview/view",
      icon: BookOpen,
      color: "#1A4B8C"
    }
  ];

  useEffect(() => {
    fetchClicks();
  }, []);

  const fetchClicks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "linkClicks"), orderBy("timestamp", "desc")));
      const list = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      setClicks(list);
    } catch (err) {
      console.error("Error fetching click data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = async (link) => {
    const utmUrl = `${link.url}?utm_source=linkinbio&utm_medium=social&utm_campaign=silent_veto_launch`;
    await logLinkClick(link.id, utmUrl);
    window.open(utmUrl, "_blank");
    fetchClicks(); // reload counts
  };

  const getClickCount = (linkId) => {
    return clicks.filter(c => c.linkId === linkId).length;
  };

  // Render the actual public Link-in-Bio screen
  const renderPublicView = () => {
    return (
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "3rem 1.5rem",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "var(--font-sans)",
          backgroundColor: "#0f172a", // Dark background for the public page
          color: "#ffffff",
          borderRadius: previewMode ? "24px" : "0px",
          border: previewMode ? "8px solid #334155" : "none",
          boxShadow: previewMode ? "var(--shadow-lg)" : "none",
          boxSizing: "border-box"
        }}
      >
        {/* Book Launch Avatar */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "var(--accent)",
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
            fontFamily: "var(--font-title)",
            boxShadow: "0 0 15px rgba(229, 169, 78, 0.4)"
          }}
        >
          V
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0", color: "#ffffff", textAlign: "center" }}>
          The Silent Veto
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "2rem", textAlign: "center" }}>
          Official Links & Pre-order Campaign
        </p>

        {/* Links Stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
          {links.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link)}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(30, 41, 59, 0.7)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  outline: "none"
                }}
                onMouseOver={e => {
                  e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.9)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.7)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: link.color, display: "flex" }}>
                    <Icon size={20} />
                  </span>
                  <span>{link.title}</span>
                </div>
                <ExternalLink size={16} style={{ color: "#64748b" }} />
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "4rem", fontSize: "0.75rem", color: "#64748b" }}>
          © 2026 Essspresso Shot Consulting
        </div>
      </div>
    );
  };

  if (previewMode) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "480px" }}>
          <button
            onClick={() => setPreviewMode(false)}
            className="btn btn-secondary"
            style={{ position: "absolute", top: "-50px", right: 0 }}
          >
            Exit Mobile View
          </button>
          {renderPublicView()}
        </div>
      </div>
    );
  }

  // Dashboard Setup View
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Link-in-Bio Setup</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Preview your public links page (`/links`), test UTM parameter injection, and track campaign click counts.
          </p>
        </div>
        <button
          onClick={() => setPreviewMode(true)}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Smartphone size={16} />
          <span>Preview Mobile Site</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
        {/* Link Click Stats */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <TrendingUp size={20} style={{ color: "var(--accent)" }} /> Campaign Performance Analytics
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {links.map(link => {
              const clickCount = getClickCount(link.id);
              return (
                <div
                  key={link.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    backgroundColor: "#f8fafc"
                  }}
                >
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div style={{ color: link.color }}><link.icon size={20} /></div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{link.title}</div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        ID: {link.id}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {clickCount}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>clicks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Event Stream */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <MousePointerClick size={20} style={{ color: "var(--accent)" }} /> Click Event stream
          </h3>

          {loading ? (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Loading...</div>
          ) : (
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Link ID</th>
                    <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Campaign Details</th>
                    <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {clicks.map((click, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{click.linkId}</td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                        src: {click.utmSource} | med: {click.utmMedium}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem" }}>
                        {new Date(click.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {clicks.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                        No clicks logged yet. Click "Preview Mobile Site" to test link clicks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export { logLinkClick };
