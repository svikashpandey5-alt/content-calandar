import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Database,
  Users,
  Shield,
  Save,
  Trash2,
  RefreshCw,
  Plus,
  Key,
  Sparkles
} from "lucide-react";
import { updateConfig, regenerateCalendarInDb } from "../services/db";
import { seedDatabase } from "../services/seeder";
import { parseRulesWithAI } from "../services/gemini";
import { db } from "../firebase";
import { collection, getDocs, doc, writeBatch, setDoc } from "firebase/firestore";

const Youtube = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

export default function Settings({ config, onRefresh }) {
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [waYapEvery, setWaYapEvery] = useState(4);
  const [otherBucketOrder, setOtherBucketOrder] = useState("");
  
  // New scheduling rules states
  const [mainYapEvery, setMainYapEvery] = useState(2);
  const [collisionAvoidance, setCollisionAvoidance] = useState(true);
  const [autoPublishIG, setAutoPublishIG] = useState(true);
  const [autoPublishFB, setAutoPublishFB] = useState(true);
  const [autoPublishYT, setAutoPublishYT] = useState(true);
  
  const [saving, setSaving] = useState(false);

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState("");

  // Seed Counts
  const [seedCarousel, setSeedCarousel] = useState(15);
  const [seedPoster, setSeedPoster] = useState(15);
  const [seedReview, setSeedReview] = useState(10);
  const [seedRedacted, setSeedRedacted] = useState(10);
  const [seedFinalLine, setSeedFinalLine] = useState(10);
  const [seedAnimation, setSeedAnimation] = useState(15);
  const [seedYAP, setSeedYAP] = useState(20);
  const [seeding, setSeeding] = useState(false);

  // Team Users
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [newName, setNewName] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (config) {
      setScheduleStartDate(config.scheduleStartDate || "2026-07-18");
      setWaYapEvery(config.waYapEvery || 4);
      setMainYapEvery(config.mainYapEvery || 2);
      setCollisionAvoidance(config.collisionAvoidance !== false);
      setAutoPublishIG(config.autoPublishIG !== false);
      setAutoPublishFB(config.autoPublishFB !== false);
      setAutoPublishYT(config.autoPublishYT !== false);
      setOtherBucketOrder(
        config.otherBucketOrder ? config.otherBucketOrder.join(", ") : "Animation, Redacted, Carousel, Poster, Review, Final Line"
      );
    }
    
    // Load local Gemini API key
    const savedKey = localStorage.getItem("TV_GEMINI_API_KEY") || "";
    setGeminiKey(savedKey);

    // Fetch team users
    fetchUsers();
  }, [config]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const usersList = [];
      snap.forEach(doc => {
        usersList.push(doc.data());
      });
      setUsers(usersList);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedOrder = otherBucketOrder
        .split(",")
        .map(b => b.trim())
        .filter(b => b.length > 0);

      const defaultColors = [
        { bg: "#D6E4FF", text: "#1A4B8C" }, // Blue
        { bg: "#E9DDFB", text: "#5B3A9E" }, // Purple
        { bg: "#FFF1C2", text: "#8A6D00" }, // Yellow
        { bg: "#E4E8EC", text: "#37474F" }, // Gray
        { bg: "#FFE2CC", text: "#9A4E14" }, // Orange
        { bg: "#FBD8E7", text: "#9A2A5C" }, // Pink
        { bg: "#D6F1DA", text: "#1E6B39" }  // Green
      ];

      const newColors = { ...config?.bucketColors };
      parsedOrder.forEach((b, idx) => {
        if (!newColors[b]) {
          newColors[b] = defaultColors[idx % defaultColors.length];
        }
      });

      // Keep YAP color always
      if (!newColors["YAP"]) {
        newColors["YAP"] = { bg: "#D6F1DA", text: "#1E6B39" };
      }

      await updateConfig({
        scheduleStartDate,
        waYapEvery: parseInt(waYapEvery, 10),
        mainYapEvery: parseInt(mainYapEvery, 10),
        otherBucketOrder: parsedOrder,
        collisionAvoidance,
        autoPublishIG,
        autoPublishFB,
        autoPublishYT,
        bucketColors: newColors
      });
      
      await regenerateCalendarInDb();
      alert("Configuration updated successfully and calendar regenerated!");
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeminiKey = (e) => {
    e.preventDefault();
    localStorage.setItem("TV_GEMINI_API_KEY", geminiKey.trim());
    alert("Gemini API Key saved locally in your browser!");
  };

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed mock data? This will add mock assets to the database.")) {
      return;
    }
    setSeeding(true);
    try {
      const total = await seedDatabase({
        Carousel: seedCarousel,
        Poster: seedPoster,
        Review: seedReview,
        Redacted: seedRedacted,
        "Final Line": seedFinalLine,
        Animation: seedAnimation,
        YAP: seedYAP
      });
      alert(`Successfully seeded database with ${total} mock assets!`);
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("Seeding failed: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDb = async () => {
    if (!confirm("CRITICAL WARNING: This will delete ALL assets, calendar schedule days, counters, and reset configuration. Are you sure you want to proceed?")) {
      return;
    }
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      
      // Clear Assets
      const assetsSnap = await getDocs(collection(db, "assets"));
      assetsSnap.forEach(d => batch.delete(d.ref));
      
      // Clear Calendar Days
      const calSnap = await getDocs(collection(db, "calendarDays"));
      calSnap.forEach(d => batch.delete(d.ref));

      // Clear Counters
      const countSnap = await getDocs(collection(db, "counters"));
      countSnap.forEach(d => batch.delete(d.ref));

      // Reset Config
      const configRef = doc(db, "config", "settings");
      batch.delete(configRef);

      await batch.commit();
      alert("Database wiped successfully. Reloading initial states...");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to clear database.");
    } finally {
      setSeeding(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;
    try {
      const uid = "user_" + Date.now(); // local mock UID or generated
      const newUser = {
        uid,
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole
      };
      await setDoc(doc(db, "users", uid), newUser);
      alert("Team member added!");
      setNewName("");
      setNewEmail("");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to add user.");
    }
  };

  // Gemini AI Rules states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSaving, setAiSaving] = useState(false);

  const handleApplyAIRules = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiSaving(true);
    try {
      const parsedConfig = await parseRulesWithAI(aiPrompt.trim(), config);
      
      const updateData = {};
      let changed = false;

      if (parsedConfig.scheduleStartDate && parsedConfig.scheduleStartDate !== config.scheduleStartDate) {
        updateData.scheduleStartDate = parsedConfig.scheduleStartDate;
        changed = true;
      }
      if (parsedConfig.waYapEvery !== undefined && parsedConfig.waYapEvery !== config.waYapEvery) {
        updateData.waYapEvery = parseInt(parsedConfig.waYapEvery, 10);
        changed = true;
      }
      if (parsedConfig.mainYapEvery !== undefined && parsedConfig.mainYapEvery !== config.mainYapEvery) {
        updateData.mainYapEvery = parseInt(parsedConfig.mainYapEvery, 10);
        changed = true;
      }
      if (parsedConfig.collisionAvoidance !== undefined && parsedConfig.collisionAvoidance !== config.collisionAvoidance) {
        updateData.collisionAvoidance = !!parsedConfig.collisionAvoidance;
        changed = true;
      }
      if (parsedConfig.autoPublishIG !== undefined && parsedConfig.autoPublishIG !== config.autoPublishIG) {
        updateData.autoPublishIG = !!parsedConfig.autoPublishIG;
        changed = true;
      }
      if (parsedConfig.autoPublishFB !== undefined && parsedConfig.autoPublishFB !== config.autoPublishFB) {
        updateData.autoPublishFB = !!parsedConfig.autoPublishFB;
        changed = true;
      }
      if (parsedConfig.autoPublishYT !== undefined && parsedConfig.autoPublishYT !== config.autoPublishYT) {
        updateData.autoPublishYT = !!parsedConfig.autoPublishYT;
        changed = true;
      }
      if (parsedConfig.otherBucketOrder && Array.isArray(parsedConfig.otherBucketOrder)) {
        const orderEqual = JSON.stringify(parsedConfig.otherBucketOrder) === JSON.stringify(config.otherBucketOrder);
        if (!orderEqual) {
          updateData.otherBucketOrder = parsedConfig.otherBucketOrder;
          changed = true;

          const defaultColors = [
            { bg: "#D6E4FF", text: "#1A4B8C" },
            { bg: "#E9DDFB", text: "#5B3A9E" },
            { bg: "#FFF1C2", text: "#8A6D00" },
            { bg: "#E4E8EC", text: "#37474F" },
            { bg: "#FFE2CC", text: "#9A4E14" },
            { bg: "#FBD8E7", text: "#9A2A5C" },
            { bg: "#D6F1DA", text: "#1E6B39" }
          ];
          const newColors = { ...config?.bucketColors };
          parsedConfig.otherBucketOrder.forEach((b, idx) => {
            if (!newColors[b]) {
              newColors[b] = defaultColors[idx % defaultColors.length];
            }
          });
          updateData.bucketColors = newColors;
        }
      }

      if (changed) {
        await updateConfig(updateData);
        await regenerateCalendarInDb();
        await onRefresh();
        alert("AI successfully updated and applied the new rules! Check the changes on the left.");
        setAiPrompt("");
      } else {
        alert("AI read your instruction, but it did not request any changes to the current rules configuration.");
      }
    } catch (err) {
      console.error("AI rule parsing failed:", err);
      alert("AI failed to understand/apply rule: " + err.message);
    } finally {
      setAiSaving(false);
    }
  };

  const handleStartYouTubeAuth = () => {
    const clientId = "163499969103-osn60sf2d3ap3dm4br2ckd0rg34ki15t.apps.googleusercontent.com";
    const redirectUri = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/oauth/callback"
      : "https://content-calendar-1adf3.web.app/oauth/callback";
    const scope = "https://www.googleapis.com/auth/youtube.upload";
    const responseType = "code";
    const accessType = "offline";
    const prompt = "consent";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=${encodeURIComponent(responseType)}&` +
      `access_type=${encodeURIComponent(accessType)}&` +
      `prompt=${encodeURIComponent(prompt)}`;

    window.location.href = authUrl;
  };

  const handleCopyAuthLink = () => {
    const clientId = "163499969103-osn60sf2d3ap3dm4br2ckd0rg34ki15t.apps.googleusercontent.com";
    const redirectUri = "https://content-calendar-1adf3.web.app/oauth/callback";
    const scope = "https://www.googleapis.com/auth/youtube.upload";
    const responseType = "code";
    const accessType = "offline";
    const prompt = "consent";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=${encodeURIComponent(responseType)}&` +
      `access_type=${encodeURIComponent(accessType)}&` +
      `prompt=${encodeURIComponent(prompt)}`;

    navigator.clipboard.writeText(authUrl);
    alert("YouTube authorization link copied to clipboard! You can send this link to the YouTube channel owner.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Settings / Admin</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Configure scheduling rules, manage the team, enter API credentials, and perform database migrations.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "2rem" }}>
        {/* Tunable Rules */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <SettingsIcon size={20} style={{ color: "var(--accent)" }} /> Tunable Scheduling Rules
          </h3>
          <form onSubmit={handleSaveConfig} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Schedule Start Date</label>
              <input
                type="date"
                className="input-field"
                required
                value={scheduleStartDate}
                onChange={e => setScheduleStartDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>WhatsApp YAP Cadence</label>
              <input
                type="number"
                min="1"
                className="input-field"
                required
                value={waYapEvery}
                onChange={e => setWaYapEvery(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>WhatsApp: YAP appears every N-th slot</span>
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Other Buckets Round-Robin Order</label>
              <input
                type="text"
                className="input-field"
                required
                value={otherBucketOrder}
                onChange={e => setOtherBucketOrder(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Comma-separated list of bucket names</span>
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Main Feed YAP Cadence</label>
              <input
                type="number"
                min="1"
                className="input-field"
                required
                value={mainYapEvery}
                onChange={e => setMainYapEvery(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>YAP appears every N-th slot in the main calendar sequence (default: 2 = alternate)</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input
                type="checkbox"
                id="collisionAvoidance"
                checked={collisionAvoidance}
                onChange={e => setCollisionAvoidance(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="collisionAvoidance" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                Enable WhatsApp Collision Avoidance
              </label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Automated Publishing Platforms</span>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoPublishIG}
                    onChange={e => setAutoPublishIG(e.target.checked)}
                  />
                  Instagram
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoPublishFB}
                    onChange={e => setAutoPublishFB(e.target.checked)}
                  />
                  Facebook
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoPublishYT}
                    onChange={e => setAutoPublishYT(e.target.checked)}
                  />
                  YouTube
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
            >
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save Rules"}</span>
            </button>
          </form>
        </div>

        {/* API Credentials */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <Key size={20} style={{ color: "var(--accent)" }} /> Local API Keys
          </h3>
          <form onSubmit={handleSaveGeminiKey} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Gemini API Key</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter Gemini API Key..."
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Saved locally in your browser storage. Used for AI caption generation.
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
            >
              <Save size={16} />
              <span>Save Credentials</span>
            </button>
          </form>
        </div>

        {/* Gemini AI Rules Assistant */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <Sparkles size={20} style={{ color: "var(--accent)" }} /> AI Config Assistant (Gemini)
          </h3>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Enter scheduling rules or changes in plain English (e.g. <i>"change start date to 10th August and make WhatsApp cadence every 3 slots"</i>).
          </div>
          <form onSubmit={handleApplyAIRules} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <textarea
                className="input-field"
                rows="3"
                placeholder="Type your plain English instruction..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                required
                style={{ resize: "vertical" }}
              />
            </div>
            <button
              type="submit"
              disabled={aiSaving || !aiPrompt.trim()}
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {aiSaving ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Parsing rules with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Apply Rules with AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* YouTube OAuth Setup */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <Youtube size={20} style={{ color: "#FF0000" }} /> YouTube Channel Connection
          </h3>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Authorize the Google account owning the target YouTube Channel to enable automated video posting.
          </div>
          
          {config?.youtubeLinked ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem", backgroundColor: "rgba(74,222,128,0.1)", borderRadius: "8px", border: "1px solid rgba(74,222,128,0.2)", fontSize: "0.85rem", color: "#4ade80" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600 }}>
                <span>✓ Connection Active</span>
              </div>
              {config.youtubeLinkedAt && (
                <span style={{ fontSize: "0.75rem", color: "rgba(74,222,128,0.7)" }}>
                  Authorized on: {new Date(config.youtubeLinkedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem", backgroundColor: "rgba(229,169,78,0.1)", borderRadius: "8px", border: "1px solid rgba(229,169,78,0.2)", fontSize: "0.85rem", color: "var(--accent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600 }}>
                <span>⚠ Not Connected</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "rgba(229,169,78,0.7)" }}>
                OAuth token is missing. Scheduled uploads will be skipped.
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
            <button
              onClick={handleStartYouTubeAuth}
              className="btn btn-primary"
              style={{ flex: 1, backgroundColor: "#FF0000", color: "#ffffff", borderColor: "#FF0000", fontSize: "0.8rem", padding: "0.5rem" }}
            >
              <Youtube size={14} />
              <span>Link Account</span>
            </button>
            <button
              onClick={handleCopyAuthLink}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: "0.8rem", padding: "0.5rem" }}
              title="Copy OAuth consent link to send to channel owner"
            >
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "2rem" }}>
        {/* Team Member Management */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <Users size={20} style={{ color: "var(--accent)" }} /> Team Members
          </h3>
          
          <form onSubmit={handleAddUser} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Name"
              style={{ flex: 1, minWidth: "120px" }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
            <input
              type="email"
              className="input-field"
              placeholder="Email"
              style={{ flex: 2, minWidth: "180px" }}
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
            />
            <select
              className="input-field"
              style={{ width: "110px" }}
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem" }}>
              <Plus size={16} />
            </button>
          </form>

          {loadingUsers ? (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Loading team...</div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Name</th>
                    <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Email</th>
                    <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.uid} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>{u.email}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span
                          className={`status-pill ${u.role === "admin" ? "status-Ready" : "status-Draft"}`}
                          style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}
                        >
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No invited team members yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Database Migration & Seeding */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
            <Database size={20} style={{ color: "var(--accent)" }} /> Warehouse Seeding & Wiping
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Customize seed bucket sizes:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", fontSize: "0.8rem" }}>
              <div>
                <label>Carousel</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedCarousel} onChange={e => setSeedCarousel(parseInt(e.target.value))} />
              </div>
              <div>
                <label>Poster</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedPoster} onChange={e => setSeedPoster(parseInt(e.target.value))} />
              </div>
              <div>
                <label>Review</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedReview} onChange={e => setSeedReview(parseInt(e.target.value))} />
              </div>
              <div>
                <label>Redacted</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedRedacted} onChange={e => setSeedRedacted(parseInt(e.target.value))} />
              </div>
              <div>
                <label>Final Line</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedFinalLine} onChange={e => setSeedFinalLine(parseInt(e.target.value))} />
              </div>
              <div>
                <label>Animation</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedAnimation} onChange={e => setSeedAnimation(parseInt(e.target.value))} />
              </div>
              <div>
                <label>YAP</label>
                <input type="number" className="input-field" style={{ padding: "0.25rem" }} value={seedYAP} onChange={e => setSeedYAP(parseInt(e.target.value))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <RefreshCw size={14} className={seeding ? "spin" : ""} />
                <span>{seeding ? "Processing..." : "Seed Database"}</span>
              </button>

              <button
                type="button"
                onClick={handleClearDb}
                disabled={seeding}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                <Trash2 size={14} />
                <span>Wipe Database</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
