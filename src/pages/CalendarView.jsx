import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  SkipForward,
  ExternalLink
} from "lucide-react";
import { updateAsset, regenerateCalendarInDb } from "../services/db";

export default function CalendarView({ assets, calendarDays, onRefresh, config }) {
  const [selectedCell, setSelectedCell] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Today's date (YYYY-MM-DD)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const platforms = ["IG", "FB", "LinkedIn", "Snapchat", "YT", "WhatsApp"];
  const platformNames = {
    IG: "Instagram",
    FB: "Facebook",
    LinkedIn: "LinkedIn",
    Snapchat: "Snapchat",
    YT: "YouTube",
    WhatsApp: "WhatsApp"
  };

  const getCellAsset = (assetId) => {
    return assets.find(a => a.assetId === assetId) || null;
  };

  const handleCellClick = (row, platform) => {
    const assetId = row[platform];
    if (!assetId || assetId === "ALL CONTENT USED") return;
    
    const asset = getCellAsset(assetId);
    setSelectedCell({
      date: row.date,
      platform,
      assetId,
      asset
    });
  };

  const handleAction = async (actionType) => {
    if (!selectedCell || updating) return;
    setUpdating(true);
    try {
      const { assetId, platform } = selectedCell;
      const asset = selectedCell.asset;
      
      if (actionType === "posted") {
        const postedOn = { ...asset.postedOn, [platform]: true };
        await updateAsset(assetId, { postedOn });
      } else if (actionType === "skip") {
        const skippedOn = { ...asset.skippedOn, [platform]: true };
        await updateAsset(assetId, { skippedOn });
      } else if (actionType === "unskip") {
        const skippedOn = { ...asset.skippedOn, [platform]: false };
        await updateAsset(assetId, { skippedOn });
      } else if (actionType === "unpost") {
        const postedOn = { ...asset.postedOn, [platform]: false };
        await updateAsset(assetId, { postedOn });
      }

      await regenerateCalendarInDb();
      await onRefresh();
      
      // Update cell status in modal preview
      const updatedAssetsList = await onRefresh(); // wait and reload
      setSelectedCell(null); // close modal
    } catch (err) {
      console.error("Failed to update cell action:", err);
      alert("Error performing action.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Calendar Schedule</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Complete chronological projection of daily postings across all platforms. Click any cell to manage asset states.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "1rem",
          marginBottom: "1.5rem",
          alignItems: "center"
        }}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginRight: "0.5rem" }}>
          Bucket Legend:
        </span>
        {Object.keys(config?.bucketColors || {}).map(bucket => (
          <span
            key={bucket}
            className="bucket-chip"
            style={{
              fontSize: "0.7rem",
              padding: "0.2rem 0.5rem",
              backgroundColor: config?.bucketColors?.[bucket]?.bg || "#e2e8f0",
              color: config?.bucketColors?.[bucket]?.text || "#334155"
            }}
          >
            {bucket}
          </span>
        ))}
        <span
          className="bucket-chip"
          style={{
            backgroundColor: "#f1f5f9",
            color: "#64748b",
            fontSize: "0.7rem",
            padding: "0.2rem 0.5rem",
            border: "1px dashed var(--border-color)"
          }}
        >
          All Content Used
        </span>
      </div>

      {/* Rules & Constraints Section */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span>📋 Active Scheduling Rules & Constraints</span>
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <strong style={{ color: "#ffffff" }}>1. Weaving Rule</strong>
            <p style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Days alternate: Even calendar entries = <strong>YAP</strong> bucket, Odd calendar entries = <strong>Non-YAP</strong> buckets.
            </p>
          </div>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <strong style={{ color: "#ffffff" }}>2. WhatsApp Sequence</strong>
            <p style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              WhatsApp posts a <strong>YAP</strong> asset exactly every <strong>{config?.waYapEvery || 4} slots</strong>. Other slots are skipped/deferred.
            </p>
          </div>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <strong style={{ color: "#ffffff" }}>3. Round-Robin Queue Walk</strong>
            <p style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Non-YAP platforms walk the other buckets in order: <strong>{config?.otherBucketOrder?.join(" → ") || "Animation → Redacted → Carousel → Poster → Review → Final Line"}</strong>.
            </p>
          </div>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <strong style={{ color: "#ffffff" }}>4. Target Platforms</strong>
            <p style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Auto-posting: <strong>IG, FB, YouTube</strong>. Manual tracking: <strong>LinkedIn, Snapchat, WhatsApp</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: "130px" }}>Date</th>
              <th style={{ width: "100px" }}>Day</th>
              {platforms.map(p => (
                <th key={p}>{platformNames[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarDays.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  No content ready or generated in schedule. Please add content in Warehouse and ensure they are marked "Ready".
                </td>
              </tr>
            ) : (
              calendarDays.map(row => {
                const isToday = row.date === todayStr;
                const isPast = row.date < todayStr;
                
                return (
                  <tr
                    key={row.date}
                    style={{
                      opacity: isPast ? 0.65 : 1,
                      backgroundColor: isToday ? "var(--accent-light)" : "transparent",
                      borderLeft: isToday ? "4px solid var(--accent)" : "none",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <td style={{ fontWeight: isToday ? 600 : 500, color: isToday ? "var(--text-primary)" : "inherit" }}>
                      {row.date}
                      {isToday && (
                        <span
                          style={{
                            display: "inline-block",
                            marginLeft: "0.5rem",
                            fontSize: "0.65rem",
                            backgroundColor: "var(--accent)",
                            color: "#fff",
                            padding: "0.1rem 0.3rem",
                            borderRadius: "3px",
                            verticalAlign: "middle"
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{row.day}</td>
                    {platforms.map(p => {
                      const assetId = row[p];
                      const isExhausted = assetId === "ALL CONTENT USED";
                      const asset = isExhausted ? null : getCellAsset(assetId);
                      const isPosted = asset?.postedOn?.[p];
                      
                      let cellStyle = {};
                      let chipClass = "";
                      
                      if (isExhausted) {
                        cellStyle = {
                          backgroundColor: "#f8fafc",
                          color: "#94a3b8",
                          border: "1px dashed #cbd5e1",
                          borderRadius: "4px",
                          textAlign: "center",
                          fontSize: "0.75rem",
                          fontStyle: "italic",
                          padding: "0.5rem"
                        };
                      } else if (asset) {
                        cellStyle = {
                          cursor: "pointer",
                          display: "inline-flex",
                          flexDirection: "column",
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          position: "relative",
                          border: "1px solid rgba(0,0,0,0.05)",
                          backgroundColor: config?.bucketColors?.[asset.bucket]?.bg || "#e2e8f0",
                          color: config?.bucketColors?.[asset.bucket]?.text || "#334155"
                        };
                      }

                      return (
                        <td key={p} style={{ padding: "0.5rem" }}>
                          {isExhausted ? (
                            <div style={cellStyle}>ALL USED</div>
                          ) : asset ? (
                            <div
                              onClick={() => handleCellClick(row, p)}
                              className="bucket-chip"
                              style={cellStyle}
                              title={`Click to manage: ${asset.name}`}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", gap: "0.25rem", marginBottom: "0.15rem" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{assetId}</span>
                                {isPosted && (
                                  <span style={{ color: "inherit", display: "inline-flex", alignItems: "center" }} title="Posted">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 400,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "110px",
                                  display: "block"
                                }}
                              >
                                {asset.name}
                              </span>
                            </div>
                          ) : (
                            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
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
          <div className="card" style={{ width: "90%", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Manage Slot</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setSelectedCell(null)}
              >
                Close
              </button>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                <strong>Platform:</strong> {platformNames[selectedCell.platform]} ({selectedCell.platform})<br />
                <strong>Scheduled Date:</strong> {selectedCell.date}
              </div>

              <div
                className="bucket-chip"
                style={{
                  marginBottom: "0.5rem",
                  backgroundColor: config?.bucketColors?.[selectedCell.asset.bucket]?.bg || "#e2e8f0",
                  color: config?.bucketColors?.[selectedCell.asset.bucket]?.text || "#334155"
                }}
              >
                {selectedCell.asset.bucket}
              </div>

              <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: "0.25rem 0" }}>
                {selectedCell.asset.name}
              </h4>
              
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Asset ID: {selectedCell.assetId} | Format: {selectedCell.asset.format}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {selectedCell.asset.assetLink && (
                <a
                  href={selectedCell.asset.assetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ width: "100%", textDecoration: "none" }}
                >
                  <ExternalLink size={14} /> Open Drive File
                </a>
              )}

              {selectedCell.asset.postedOn?.[selectedCell.platform] ? (
                <button
                  onClick={() => handleAction("unpost")}
                  disabled={updating}
                  className="btn btn-danger"
                  style={{ width: "100%" }}
                >
                  Mark as Unposted
                </button>
              ) : (
                <button
                  onClick={() => handleAction("posted")}
                  disabled={updating}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  <CheckCircle size={14} /> Mark as Posted
                </button>
              )}

              {selectedCell.asset.skippedOn?.[selectedCell.platform] ? (
                <button
                  onClick={() => handleAction("unskip")}
                  disabled={updating}
                  className="btn btn-secondary"
                  style={{ width: "100%" }}
                >
                  Unskip Asset (Restore Order)
                </button>
              ) : (
                <button
                  onClick={() => handleAction("skip")}
                  disabled={updating}
                  className="btn btn-secondary"
                  style={{ width: "100%", color: "#ea580c", borderColor: "#f97316" }}
                >
                  <SkipForward size={14} /> Skip / Defer to End
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
