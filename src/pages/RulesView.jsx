import React from "react";
import {
  HelpCircle,
  ToggleLeft,
  Calendar,
  Grid,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function RulesView({ config }) {
  const {
    scheduleStartDate = "2026-07-18",
    waYapEvery = 4,
    mainYapEvery = 2,
    otherBucketOrder = ["Animation", "Redacted", "Carousel", "Poster", "Review", "Final Line"],
    collisionAvoidance = true,
    autoPublishIG = true,
    autoPublishFB = true,
    autoPublishYT = true
  } = config || {};

  const autoPublishPlatforms = [];
  const manualPlatforms = [];

  if (autoPublishIG) autoPublishPlatforms.push("Instagram"); else manualPlatforms.push("Instagram");
  if (autoPublishFB) autoPublishPlatforms.push("Facebook"); else manualPlatforms.push("Facebook");
  if (autoPublishYT) autoPublishPlatforms.push("YouTube"); else manualPlatforms.push("YouTube");
  
  // LinkedIn, Snapchat, WhatsApp are always manual
  manualPlatforms.push("LinkedIn", "Snapchat", "WhatsApp");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Scheduling Rules & Logic</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Full breakdown of the algorithmic constraints and policies governing the generated posting schedule.
        </p>
      </div>

      {/* Rules Overview Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Weaving Cadence Rule */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(229,169,78,0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyCenter: "center", justifyContent: "center" }}>
              <Grid size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>1. Main Feed Weaving Rule</h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", flex: 1 }}>
            Controls the distribution ratio of your core brand assets (<strong>YAP</strong>) relative to secondary content buckets.
          </p>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Current Setup:</span><br />
            YAP appears every <strong>{mainYapEvery} slots</strong>.
            {mainYapEvery === 2 ? " This alternates strictly: YAP, Non-YAP, YAP, Non-YAP..." : ` This weaves 1 YAP followed by ${mainYapEvery - 1} Non-YAPs.`}
          </div>
        </div>

        {/* WhatsApp Sequence Rule */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(37,211,102,0.1)", color: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>2. WhatsApp Cadence Rule</h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", flex: 1 }}>
            WhatsApp broadcasts operate on a separate pacing interval to avoid spamming direct subscriber channels.
          </p>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Current Setup:</span><br />
            WhatsApp schedules a <strong>YAP</strong> post exactly every <strong>{waYapEvery} slots</strong>. All other slots are skipped or deferred.
          </div>
        </div>

        {/* Round-Robin Order Rule */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(99,102,241,0.1)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>3. Round-Robin Sequence</h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", flex: 1 }}>
            Secondary content walks through available non-YAP buckets sequentially to ensure diverse daily coverage.
          </p>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.8rem", wordBreak: "break-all" }}>
            <span style={{ color: "var(--text-muted)" }}>Current Queue Rotation:</span><br />
            <strong>{otherBucketOrder.join(" → ")}</strong>
          </div>
        </div>

        {/* Collision Avoidance */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: collisionAvoidance ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", color: collisionAvoidance ? "#4ade80" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ToggleLeft size={18} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>4. Collision Avoidance</h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", flex: 1 }}>
            Prevents scheduling the same file on WhatsApp and other social networks on the exact same date.
          </p>
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Status:</span><br />
            {collisionAvoidance ? (
              <span style={{ color: "#4ade80", fontWeight: 600 }}>ACTIVE</span>
            ) : (
              <span style={{ color: "#ef4444", fontWeight: 600 }}>DISABLED</span>
            )}
            {collisionAvoidance && " — Colliding files are automatically deferred to the end of the WhatsApp queue."}
          </div>
        </div>

      </div>

      {/* Platform Posting Statuses */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Platform Distribution Channels</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "0.5rem" }}>
          
          <div>
            <h4 style={{ fontSize: "0.95rem", color: "#4ade80", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
              <CheckCircle2 size={16} /> Automated Publishing (Phase A Mocks)
            </h4>
            <ul style={{ listStyleType: "none", paddingLeft: 0, display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {autoPublishPlatforms.map(p => (
                <li key={p} style={{ padding: "0.4rem 0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                  <strong>{p}</strong> — Publishes directly to API on date arrival.
                </li>
              ))}
              {autoPublishPlatforms.length === 0 && (
                <li style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No platforms currently toggled for auto-publishing.</li>
              )}
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "0.95rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
              <AlertCircle size={16} /> Manual-Tracking Required
            </h4>
            <ul style={{ listStyleType: "none", paddingLeft: 0, display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {manualPlatforms.map(p => (
                <li key={p} style={{ padding: "0.4rem 0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                  <strong>{p}</strong> — Requires logging in to mark as "Posted" (Manual-track).
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Logical Diagram */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Scheduling Flow Diagram</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem", backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "0.825rem", color: "var(--text-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", fontWeight: 600 }}>Step 1</span>
            <span>Filters all assets marked <strong>"Ready"</strong> in the content warehouse.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", fontWeight: 600 }}>Step 2</span>
            <span>Establishes non-YAP sequence using <strong>Round-Robin</strong> rotation on: <i>{otherBucketOrder.join(", ")}</i>.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", fontWeight: 600 }}>Step 3</span>
            <span>Generates Main Feed sequence by weaving <strong>YAP</strong> every <strong>{mainYapEvery} slots</strong>.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", fontWeight: 600 }}>Step 4</span>
            <span>Constructs WhatsApp raw sequence by scheduling <strong>YAP</strong> every <strong>{waYapEvery} slots</strong>.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", fontWeight: 600 }}>Step 5</span>
            <span>Walks chronologically starting from <strong>{scheduleStartDate}</strong>. Assigns main platforms.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", fontWeight: 600 }}>Step 6</span>
            <span>Assigns WhatsApp slot. {collisionAvoidance ? <strong>Applies collision-avoidance check</strong> : "Bypasses collision checks"} to prevent same-day matching on other feeds.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
