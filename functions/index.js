const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.oauthCallback = onRequest({ cors: true }, async (req, res) => {
  const { google } = require("googleapis");
  const code = req.query.code;
  if (!code) {
    res.status(400).send("Authorization code is missing.");
    return;
  }

  // Determine redirect URI dynamically based on the host
  const host = req.headers.host || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("5001");
  const redirectUri = isLocal 
    ? "http://localhost:3000/oauth/callback" 
    : "https://content-calendar-1adf3.web.app/oauth/callback";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send("Google Client Credentials are not configured on the server.");
    return;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.warn("No refresh token returned. Access token only.");
    }

    // Save tokens securely in secrets/youtube (hidden from clients)
    const db = admin.firestore();
    const tokenData = {
      accessToken: tokens.access_token || null,
      expiryDate: tokens.expiry_date || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (tokens.refresh_token) {
      tokenData.refreshToken = tokens.refresh_token;
    }

    await db.collection("secrets").doc("youtube").set(tokenData, { merge: true });

    // Update public metadata state youtubeLinked: true in config/settings
    await db.collection("config").doc("settings").set({
      youtubeLinked: true,
      youtubeLinkedAt: new Date().toISOString()
    }, { merge: true });

    // Send success HTML page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #07090e;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background: rgba(15, 22, 38, 0.5);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 2.5rem;
              border-radius: 14px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
              max-width: 400px;
            }
            h1 { color: #4ade80; margin-top: 0; font-size: 1.5rem; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            .badge {
              display: inline-block;
              background: rgba(74, 222, 128, 0.1);
              color: #4ade80;
              padding: 0.25rem 0.75rem;
              border-radius: 99px;
              font-size: 0.8rem;
              font-weight: 600;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">YouTube Integration</div>
            <h1>Authorization Successful!</h1>
            <p>Google OAuth code has been exchanged and the refresh token is stored securely in your database.</p>
            <p style="margin-bottom: 0;">You can safely close this window now.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).send(`Failed to exchange authorization code: ${error.message}`);
  }
});

exports.autoPostToYouTube = onDocumentUpdated("assets/{assetId}", async (event) => {
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  const { Readable } = require("stream");
  const { pipeline } = require("stream/promises");

  const change = event.data;
  if (!change) return;

  const beforeData = change.before.data();
  const afterData = change.after.data();

  // Trigger conditions:
  // 1. Status changes to "Published"
  // 2. Format is "Video"
  // 3. Has not been posted to YT yet
  if (
    afterData.status === "Published" &&
    beforeData.status !== "Published" &&
    afterData.format === "Video" &&
    (!afterData.postedOn || !afterData.postedOn.YT)
  ) {
    console.log(`Starting YouTube auto-post for asset: ${event.params.assetId}`);

    const db = admin.firestore();

    // 1. Retrieve refresh token from secrets/youtube
    const secretSnap = await db.collection("secrets").doc("youtube").get();
    if (!secretSnap.exists) {
      console.error("YouTube secrets not configured. Aborting auto-post.");
      return;
    }
    const secrets = secretSnap.data();
    if (!secrets.refreshToken) {
      console.error("Missing refresh token in secrets/youtube. Aborting auto-post.");
      return;
    }

    const assetLink = afterData.assetLink;
    if (!assetLink) {
      console.error("Asset link is missing in asset document. Aborting auto-post.");
      return;
    }

    // 2. Setup temp path
    const tempLocalPath = path.join(os.tmpdir(), `${event.params.assetId}.mp4`);

    try {
      // 3. Download the video from assetLink
      console.log(`Downloading video from: ${assetLink}`);
      const response = await fetch(assetLink);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      const fileStream = fs.createWriteStream(tempLocalPath);
      await pipeline(Readable.fromWeb(response.body), fileStream);
      console.log(`Video downloaded to temporary path: ${tempLocalPath}`);

      // 4. Auth with Google OAuth client
      const { google } = require("googleapis");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: secrets.refreshToken
      });

      // 5. Upload to YouTube v3
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
      console.log("Uploading video to YouTube...");
      const res = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: {
          snippet: {
            title: afterData.name || `Teaser: ${event.params.assetId}`,
            description: `${afterData.name || ""}\n\nPreorder The Silent Veto: https://amazon.com/dp/sample\n\nUploaded automatically by Content Calendar`,
            tags: ["Teaser", "The Silent Veto", "auto-upload"]
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: fs.createReadStream(tempLocalPath)
        }
      });

      const videoId = res.data.id;
      const videoUrl = `https://youtube.com/watch?v=${videoId}`;
      console.log(`YouTube upload successful. Video ID: ${videoId}`);

      // 6. Update Firestore state
      const updateData = {
        "postedOn.YT": true,
        "scheduledDate.YT": new Date().toISOString(),
        "analytics.YT": {
          videoId: videoId,
          videoUrl: videoUrl,
          postedAt: new Date().toISOString(),
          status: "Posted"
        }
      };

      await db.collection("assets").doc(event.params.assetId).update(updateData);
      console.log("Firestore asset document updated successfully.");

    } catch (err) {
      console.error("YouTube auto-upload failed:", err);
      // Update asset document with error status so the user is notified
      await db.collection("assets").doc(event.params.assetId).update({
        "analytics.YT": {
          status: `Failed: ${err.message}`,
          failedAt: new Date().toISOString()
        }
      });
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempLocalPath)) {
        fs.unlinkSync(tempLocalPath);
        console.log("Cleaned up temporary video file.");
      }
    }
  }
});

