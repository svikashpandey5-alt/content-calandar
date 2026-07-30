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

export default function Settings({ config, onRefresh }) {
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [waYapEvery, setWaYapEvery] = useState(4);
  const [otherBucketOrder, setOtherBucketOrder] = useState("");
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
        otherBucketOrder: parsedOrder,
        bucketColors: newColors
      });
      
      alert("Configuration updated successfully!");
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
