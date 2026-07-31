import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function OAuthCallback({ onComplete }) {
  const [status, setStatus] = useState("exchanging"); // "exchanging", "success", "error"
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const exchangeCode = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) {
        setStatus("error");
        setErrorMsg("No authorization code found in the URL query parameters.");
        return;
      }

      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = window.location.origin + "/oauth/callback";

        // Call Google's OAuth 2.0 token endpoint to exchange the code
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error_description || errData.error || "Token exchange failed");
        }

        const tokens = await res.json();

        // Save tokens securely in secrets/youtube (hidden from reads)
        const tokenData = {
          accessToken: tokens.access_token || null,
          expiryDate: Date.now() + (tokens.expires_in * 1000),
          updatedAt: new Date().toISOString()
        };

        if (tokens.refresh_token) {
          tokenData.refreshToken = tokens.refresh_token;
        }

        await setDoc(doc(db, "secrets", "youtube"), tokenData, { merge: true });

        // Update public metadata state youtubeLinked: true in config/settings
        await setDoc(doc(db, "config", "settings"), {
          youtubeLinked: true,
          youtubeLinkedAt: new Date().toISOString()
        }, { merge: true });

        setStatus("success");
      } catch (err) {
        console.error("OAuth token exchange error:", err);
        setStatus("error");
        setErrorMsg(err.message || "An unknown error occurred during code exchange.");
      }
    };

    exchangeCode();
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifycontent: "center", minHeight: "80vh" }}>
      <div className="card" style={{ maxWidth: "450px", textAlign: "center", padding: "2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", margin: "2rem auto" }}>
        
        {status === "exchanging" && (
          <>
            <div style={{ width: "40px", height: "40px", border: "4px solid var(--border-color)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }}></div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600 }}>Exchanging Auth Code...</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>
              Communicating with Google OAuth services to retrieve and secure the offline access credentials.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "2.5rem", color: "#4ade80" }}>✓</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "#4ade80" }}>Authorization Successful!</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>
              Google OAuth tokens have been retrieved and the refresh token is stored securely in your database.
            </p>
            <button 
              onClick={onComplete}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to Dashboard
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "2.5rem", color: "#f87171" }}>⚠</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 600, color: "#f87171" }}>Authorization Failed</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>
              We could not complete the YouTube channel linkage.
            </p>
            <div style={{ backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", padding: "0.75rem", fontSize: "0.8rem", color: "#f87171", fontFamily: "monospace", textAlign: "left", wordBreak: "break-all" }}>
              {errorMsg}
            </div>
            <button 
              onClick={onComplete}
              className="btn btn-secondary"
              style={{ marginTop: "1rem" }}
            >
              Back to Dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
