import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import {
  addAssetTransaction,
  updateAsset,
  deleteAsset,
  bulkImportAssets,
  regenerateCalendarInDb,
  updateConfig
} from "../services/db";

export default function Warehouse({ assets, onRefresh, config }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);

  const [name, setName] = useState("");
  const [bucket, setBucket] = useState("Carousel");
  const [format, setFormat] = useState("Static");
  const [status, setStatus] = useState("Draft");
  const [assetLink, setAssetLink] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Dynamic Bucket Creation states
  const [showNewBucketInput, setShowNewBucketInput] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  
  // CSV Import States
  const [importSummary, setImportSummary] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);

  const buckets = config?.otherBucketOrder ? [...config.otherBucketOrder, "YAP"] : ["Carousel", "Poster", "Review", "Redacted", "Final Line", "Animation", "YAP"];
  const statuses = ["Draft", "Ready", "In Production", "Scheduled", "Published", "Retired"];

  // Filtered Assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBucket = selectedBucket === "All" || asset.bucket === selectedBucket;
    const matchesStatus = selectedStatus === "All" || asset.status === selectedStatus;
    return matchesSearch && matchesBucket && matchesStatus;
  });

  const handleOpenAdd = () => {
    setName("");
    setBucket(buckets[0] || "Carousel");
    setFormat("Static");
    setAssetLink("");
    setShowNewBucketInput(false);
    setNewBucketName("");
    setIsAddOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      let targetBucket = bucket;
      if (showNewBucketInput) {
        const cleanNewBucket = newBucketName.trim();
        if (!cleanNewBucket) {
          alert("Please enter a new bucket name.");
          setSaving(false);
          return;
        }

        // Save new bucket configuration dynamically if not present
        const currentOther = config?.otherBucketOrder || [];
        if (!currentOther.includes(cleanNewBucket) && cleanNewBucket !== "YAP") {
          const updatedOther = [...currentOther, cleanNewBucket];
          const defaultColors = [
            { bg: "#D6E4FF", text: "#1A4B8C" },
            { bg: "#E9DDFB", text: "#5B3A9E" },
            { bg: "#FFF1C2", text: "#8A6D00" },
            { bg: "#E4E8EC", text: "#37474F" },
            { bg: "#FFE2CC", text: "#9A4E14" },
            { bg: "#FBD8E7", text: "#9A2A5C" },
            { bg: "#D6F1DA", text: "#1E6B39" }
          ];
          const newColor = defaultColors[updatedOther.length % defaultColors.length];
          const updatedColors = { ...config.bucketColors, [cleanNewBucket]: newColor };

          await updateConfig({
            otherBucketOrder: updatedOther,
            bucketColors: updatedColors
          });
        }
        targetBucket = cleanNewBucket;
      }

      const newAsset = await addAssetTransaction(targetBucket, name.trim(), format, assetLink.trim(), "Ready");
      alert(`Asset added successfully! Auto-generated ID: ${newAsset.assetId}`);
      await regenerateCalendarInDb();
      await onRefresh();
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error adding asset: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (asset) => {
    setCurrentAsset(asset);
    setName(asset.name);
    setBucket(asset.bucket);
    setFormat(asset.format);
    setStatus(asset.status);
    setAssetLink(asset.assetLink || "");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentAsset) return;
    setSaving(true);
    try {
      await updateAsset(currentAsset.assetId, {
        name: name.trim(),
        format,
        status,
        assetLink: assetLink.trim()
      });
      await regenerateCalendarInDb();
      await onRefresh();
      setIsEditOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error updating asset: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRetireAsset = async (assetId) => {
    if (!confirm(`Are you sure you want to retire asset ${assetId}? It will no longer be scheduled but its ID sequence number will be preserved.`)) {
      return;
    }
    try {
      await updateAsset(assetId, { status: "Retired" });
      await regenerateCalendarInDb();
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to retire asset.");
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportSummary(null);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSV(text);
        
        if (rows.length === 0) {
          alert("CSV is empty or invalid.");
          setImporting(false);
          return;
        }

        const results = await bulkImportAssets(rows);
        setImportSummary({
          total: rows.length,
          imported: results.imported,
          duplicates: results.skippedDuplicates,
          invalid: results.skippedInvalid
        });
        setImportErrors(results.errors);

        await regenerateCalendarInDb();
        await onRefresh();
      } catch (err) {
        console.error("Error reading CSV:", err);
        alert("Failed to parse CSV. Make sure headers are correct (asset_id, name, bucket, format, status, asset_link).");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  // Basic CSV Parser keeping quotes intact
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    // Parse header row
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = [];
      let current = "";
      let inQuotes = false;

      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        const char = line[charIdx];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ""));

      const row = {};
      headers.forEach((header, idx) => {
        let val = values[idx] || "";
        let key = header;
        if (header === "asset_id") key = "assetId";
        if (header === "asset_link") key = "assetLink";
        row[key] = val;
      });

      result.push(row);
    }
    return result;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Content Warehouse</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Manage the content assets database, add assets with transaction safeguards, and perform one-time migration bulk uploads.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {/* CSV Import */}
          <label className="btn btn-secondary" style={{ position: "relative", cursor: "pointer" }}>
            <Upload size={16} />
            <span>{importing ? "Importing..." : "Bulk Import CSV"}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={importing}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer"
              }}
            />
          </label>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* CSV Import Summary Panel */}
      {importSummary && (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            backgroundColor: "#f8fafc",
            borderLeft: "4px solid var(--accent)"
          }}
        >
          <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 600 }}>
            <CheckCircle2 size={18} style={{ color: "var(--accent)" }} /> Bulk Import Completed
          </h4>
          <p style={{ fontSize: "0.85rem", margin: "0.5rem 0", color: "var(--text-secondary)" }}>
            Processed {importSummary.total} rows: <strong>{importSummary.imported}</strong> imported,{" "}
            <strong>{importSummary.duplicates}</strong> skipped (duplicates),{" "}
            <strong>{importSummary.invalid}</strong> skipped (invalid format).
          </p>
          {importErrors.length > 0 && (
            <div style={{ marginTop: "0.5rem", maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "0.5rem", borderRadius: "4px", backgroundColor: "#fff" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#991b1b" }}>Skipped Items Details:</span>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.25rem 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1rem",
          marginBottom: "1.5rem",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "240px" }}>
          <Search size={18} style={{ color: "var(--text-secondary)" }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by ID or Title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter size={16} style={{ color: "var(--text-secondary)" }} />
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Bucket:</span>
          <select
            className="input-field"
            style={{ width: "140px", padding: "0.25rem 0.5rem" }}
            value={selectedBucket}
            onChange={e => setSelectedBucket(e.target.value)}
          >
            <option value="All">All Buckets</option>
            {buckets.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Status:</span>
          <select
            className="input-field"
            style={{ width: "140px", padding: "0.25rem 0.5rem" }}
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: "100px" }}>ID</th>
              <th style={{ width: "120px" }}>Bucket</th>
              <th>Asset Title / Name</th>
              <th style={{ width: "90px" }}>Format</th>
              <th style={{ width: "130px" }}>Status</th>
              <th style={{ width: "120px" }}>Scheduled Date</th>
              <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  No assets found matching filters.
                </td>
              </tr>
            ) : (
              filteredAssets.map(asset => (
                <tr key={asset.assetId}>
                  <td style={{ fontWeight: 600 }}>{asset.assetId}</td>
                  <td>
                    <span 
                      className="bucket-chip"
                      style={{
                        backgroundColor: config?.bucketColors?.[asset.bucket]?.bg || "#e2e8f0",
                        color: config?.bucketColors?.[asset.bucket]?.text || "#334155"
                      }}
                    >
                      {asset.bucket}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{asset.name}</td>
                  <td>{asset.format}</td>
                  <td>
                    <span className={`status-pill status-${asset.status.replace(" ", "-")}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {asset.scheduledDate?.IG ? (
                      <span title={`First scheduled date across platforms: ${asset.scheduledDate.IG}`}>
                        {asset.scheduledDate.IG}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unscheduled</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                      {asset.assetLink && (
                        <a
                          href={asset.assetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem" }}
                          title="Open asset file link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenEdit(asset)}
                        className="btn btn-secondary"
                        style={{ padding: "0.35rem" }}
                        title="Edit asset details"
                      >
                        <Edit2 size={14} />
                      </button>
                      {asset.status !== "Retired" && (
                        <button
                          onClick={() => handleRetireAsset(asset.assetId)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem", color: "#ef4444", borderColor: "#fecaca" }}
                          title="Retire asset"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {isAddOpen && (
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
          <div className="card" style={{ width: "90%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Create New Content Asset</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveAdd} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Content Title / Name</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Chapter 4 Redacted Leak"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Bucket Type</label>
                  <select
                    className="input-field"
                    value={showNewBucketInput ? "__new__" : bucket}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "__new__") {
                        setShowNewBucketInput(true);
                        setBucket("");
                      } else {
                        setShowNewBucketInput(false);
                        setBucket(val);
                        if (val === "Animation" || val === "YAP") {
                          setFormat("Video");
                        } else {
                          setFormat("Static");
                        }
                      }
                    }}
                  >
                    {buckets.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="__new__">+ Create New Bucket...</option>
                  </select>
                  {showNewBucketInput && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)" }}>New Bucket Name</label>
                      <input
                        type="text"
                        className="input-field"
                        required
                        placeholder="e.g. Collab"
                        value={newBucketName}
                        onChange={e => setNewBucketName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Format</label>
                  <select
                    className="input-field"
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                  >
                    <option value="Static">Static (Image/Carousel)</option>
                    <option value="Video">Video (MP4/Reel/Short)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Google Drive Asset URL</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="e.g. https://drive.google.com/..."
                  value={assetLink}
                  onChange={e => setAssetLink(e.target.value)}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? "Generating ID..." : "Add to Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {isEditOpen && currentAsset && (
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
          <div className="card" style={{ width: "90%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Edit Asset: {currentAsset.assetId}</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Content Title / Name</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Status</label>
                  <select
                    className="input-field"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    {statuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Format</label>
                  <select
                    className="input-field"
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                  >
                    <option value="Static">Static</option>
                    <option value="Video">Video</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Google Drive Asset URL</label>
                <input
                  type="url"
                  className="input-field"
                  value={assetLink}
                  onChange={e => setAssetLink(e.target.value)}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
