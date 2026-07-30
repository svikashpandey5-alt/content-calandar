import React, { useState } from "react";
import {
  MessageSquare,
  Ghost,
  CheckCircle,
  SkipForward,
  ExternalLink,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Send
} from "lucide-react";
import { updateAsset, regenerateCalendarInDb } from "../services/db";
import { generateCaptions } from "../services/gemini";

// Custom SVG components for brand icons that are missing in newer Lucide versions
const Instagram = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Facebook = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Youtube = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const Linkedin = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const platformConfig = {
  IG: { name: "Instagram", icon: Instagram, color: "#E1306C", isAuto: true },
  FB: { name: "Facebook", icon: Facebook, color: "#1877F2", isAuto: true },
  YT: { name: "YouTube", icon: Youtube, color: "#FF0000", isAuto: true },
  LinkedIn: { name: "LinkedIn", icon: Linkedin, color: "#0A66C2", isAuto: false },
  Snapchat: { name: "Snapchat", icon: Ghost, color: "#FFFC00", textDark: true, isAuto: false },
  WhatsApp: { name: "WhatsApp", icon: MessageSquare, color: "#25D366", isAuto: false }
};

export default function Dashboard({ assets, calendarDays, onRefresh, config }) {
  const [loading, setLoading] = useState({});
  const [geminiAsset, setGeminiAsset] = useState(null);
  const [captions, setCaptions] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Today's date (formatted local YYYY-MM-DD)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Find due/overdue item for each platform
  const dashboardItems = {};
  const platforms = ["IG", "FB", "LinkedIn", "Snapchat", "YT", "WhatsApp"];
  
  platforms.forEach(p => {
    const firstUnpostedRow = calendarDays.find(row => {
      const assetId = row[p];
      if (!assetId || assetId === "ALL CONTENT USED") return false;
      const asset = assets.find(a => a.assetId === assetId);
      return asset && !asset.postedOn?.[p];
    });

    if (firstUnpostedRow) {
      const assetId = firstUnpostedRow[p];
      dashboardItems[p] = {
        date: firstUnpostedRow.date,
        assetId,
        asset: assets.find(a => a.assetId === assetId)
      };
    } else {
      dashboardItems[p] = {
        date: null,
        assetId: "ALL CONTENT USED",
        asset: null
      };
    }
  });

  const handleMarkPosted = async (platform, assetId) => {
    setLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const asset = assets.find(a => a.assetId === assetId);
      if (asset) {
        const postedOn = { ...asset.postedOn, [platform]: true };
        const updateData = { postedOn };
        
        // If it's a simulated auto-post (Phase A), also write back mock analytics
        if (platformConfig[platform].isAuto) {
          const analytics = { ...asset.analytics };
          analytics[platform] = {
            likes: Math.floor(Math.random() * 500) + 50,
            reach: Math.floor(Math.random() * 5000) + 1000,
            views: platform === "YT" ? Math.floor(Math.random() * 10000) + 500 : undefined,
            comments: Math.floor(Math.random() * 40) + 5,
            postedAt: new Date().toISOString()
          };
          updateData.analytics = analytics;
        }

        await updateAsset(assetId, updateData);
        await regenerateCalendarInDb();
        await onRefresh();
      }
    } catch (error) {
      console.error("Error updating asset status:", error);
      alert("Failed to update asset. Check console for details.");
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleSkipAsset = async (platform, assetId) => {
    if (!confirm(`Are you sure you want to skip ${assetId} on ${platform}? It will be deferred to the end of the queue.`)) {
      return;
    }
    setLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const asset = assets.find(a => a.assetId === assetId);
      if (asset) {
        const skippedOn = { ...asset.skippedOn, [platform]: true };
        await updateAsset(assetId, { skippedOn });
        await regenerateCalendarInDb();
        await onRefresh();
      }
    } catch (error) {
      console.error("Error skipping asset:", error);
      alert("Failed to skip asset.");
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleOpenGemini = (asset) => {
    setGeminiAsset(asset);
    setCaptions(null);
  };

  const handleGenerateCaptions = async () => {
    if (!geminiAsset) return;
    setGenerating(true);
    try {
      const result = await generateCaptions(geminiAsset.name, geminiAsset.bucket);
      setCaptions(result);
    } catch (error) {
      console.error("Failed to generate captions:", error);
      alert("Could not generate captions. Ensure your Gemini API Key is saved in Settings.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Dashboard</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Review pending items, auto-post status, and complete manual postings for today.
          </p>
        </div>
        <button
          onClick={async () => {
            await regenerateCalendarInDb();
            await onRefresh();
          }}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <RefreshCw size={16} />
          <span>Regenerate Calendar</span>
        </button>
      </div>

      {/* Grid of Platform Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
        {platforms.map(p => {
          const item = dashboardItems[p];
          const isExhausted = item.assetId === "ALL CONTENT USED";
          const pConf = platformConfig[p];
          const IconComponent = pConf.icon;
          
          let isOverdue = false;
          if (item.date && item.date < todayStr) {
            isOverdue = true;
          }

          return (
            <div
              key={p}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: `4px solid ${pConf.color}`,
                position: "relative",
                height: "100%",
                minHeight: "260px"
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      backgroundColor: pConf.color,
                      color: pConf.textDark ? "#000000" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <IconComponent size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{pConf.name}</h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {pConf.isAuto ? "Auto-posting" : "Manual-track only"}
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                {isExhausted ? (
                  <span className="status-pill status-Retired">All Used</span>
                ) : isOverdue ? (
                  <span className="status-pill status-Retired" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <AlertCircle size={12} /> Overdue
                  </span>
                ) : item.date === todayStr ? (
                  <span className="status-pill status-Ready" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Clock size={12} /> Today
                  </span>
                ) : (
                  <span className="status-pill status-Scheduled" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Clock size={12} /> {item.date}
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {isExhausted ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic", textAlign: "center" }}>
                    All ready content has been published. Add more assets in Content Warehouse to continue.
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span 
                        className="bucket-chip"
                        style={{
                          backgroundColor: config?.bucketColors?.[item.asset.bucket]?.bg || "#e2e8f0",
                          color: config?.bucketColors?.[item.asset.bucket]?.text || "#334155"
                        }}
                      >
                        {item.asset.bucket}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        ID: {item.assetId}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.asset.name}
                    </h4>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "auto" }}>
                      <span>Format: <strong>{item.asset.format}</strong></span>
                      <span>Scheduled date: <strong>{item.date}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              {!isExhausted && (
                <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "1.25rem", paddingTop: "1rem", display: "flex", gap: "0.5rem" }}>
                  {item.asset.assetLink && (
                    <a
                      href={item.asset.assetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                      title="Open asset file in Google Drive"
                    >
                      <ExternalLink size={14} /> Drive File
                    </a>
                  )}

                  <button
                    onClick={() => handleOpenGemini(item.asset)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                    title="Generate captions with Gemini"
                  >
                    <Sparkles size={14} style={{ color: "var(--accent)" }} /> AI Caption
                  </button>

                  {pConf.isAuto ? (
                    <button
                      onClick={() => handleMarkPosted(p, item.assetId)}
                      disabled={loading[p]}
                      className="btn btn-primary"
                      style={{ flex: 2, padding: "0.5rem", fontSize: "0.8rem", backgroundColor: "#334155" }}
                    >
                      {loading[p] ? "Publishing..." : "Simulate Publish"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSkipAsset(p, item.assetId)}
                        disabled={loading[p]}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem" }}
                        title="Skip this item"
                      >
                        <SkipForward size={14} />
                      </button>
                      <button
                        onClick={() => handleMarkPosted(p, item.assetId)}
                        disabled={loading[p]}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: "0.5rem", fontSize: "0.8rem", backgroundColor: pConf.color, color: pConf.textDark ? "#000" : "#fff" }}
                      >
                        <CheckCircle size={14} /> Posted
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gemini Repurposing Modal */}
      {geminiAsset && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div className="card" style={{ width: "90%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} style={{ color: "var(--accent)" }} /> Gemini Caption Generator
              </h3>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setGeminiAsset(null)}
              >
                Close
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Base Description / Title</label>
              <input className="input-field" type="text" value={geminiAsset.name} disabled style={{ backgroundColor: "#f1f5f9" }} />
            </div>

            <div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", display: "flex", gap: "0.5rem" }}
                onClick={handleGenerateCaptions}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Generating Platforms Variants...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate Caption Variants
                  </>
                )}
              </button>
            </div>

            {captions && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                <div>
                  <h4 style={{ fontSize: "0.875rem", color: "#E1306C", fontWeight: 600, marginBottom: "0.25rem" }}>Instagram (Visual + Hashtags)</h4>
                  <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                    {captions.instagram}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.875rem", color: "#0A66C2", fontWeight: 600, marginBottom: "0.25rem" }}>LinkedIn (Professional Tone)</h4>
                  <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                    {captions.linkedin}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.875rem", color: "#25D366", fontWeight: 600, marginBottom: "0.25rem" }}>WhatsApp / Snapchat (Casual & Direct)</h4>
                  <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                    {captions.casual}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
