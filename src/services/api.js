/**
 * Phase A Integration Service (Meta Graph API and YouTube Data API v3).
 * Wraps endpoint logic behind feature flags / sandbox mock settings for development.
 */

// Load API Keys / Access Tokens from environment if present
const META_ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN || "";
const META_PAGE_ID = import.meta.env.VITE_META_PAGE_ID || "";
const META_IG_BUSINESS_ID = import.meta.env.VITE_META_IG_BUSINESS_ID || "";
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY || "";

const IS_SANDBOX = !META_ACCESS_TOKEN; // Auto-fallback to Sandbox mode if no tokens are configured

/**
 * Publish asset to Meta platforms (Instagram Business or Facebook Pages).
 * 
 * @param {string} platform - "IG" or "FB"
 * @param {Object} asset - Asset details (name, format, link)
 * @returns {Promise<Object>} Post details (id, url, timestamp)
 */
export async function publishToMeta(platform, asset) {
  if (IS_SANDBOX) {
    console.log(`[Meta API Sandbox] Publishing "${asset.name}" to ${platform}...`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate random failure (1 in 20 chance) for robustness testing
    if (Math.random() < 0.05) {
      throw new Error(`[API Error] Meta Graph API returned OAuth Token Expired (code: 190)`);
    }

    return {
      postId: `mock_${platform.toLowerCase()}_${Date.now()}`,
      postUrl: `https://${platform.toLowerCase()}.com/mock_post_${asset.assetId}`,
      postedAt: new Date().toISOString()
    };
  }

  // Real API implementation details
  try {
    let url = "";
    let payload = {};

    if (platform === "IG") {
      // Instagram Graph API requires creating a media container first, then publishing it
      // 1. Create Media Container: POST /{ig-user-id}/media
      const containerUrl = `https://graph.facebook.com/v19.0/${META_IG_BUSINESS_ID}/media`;
      const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: asset.assetLink, // OR video_url if format is Video
          caption: `${asset.name} #TheSilentVeto`,
          media_type: asset.format === "Video" ? "REELS" : "IMAGE",
          access_token: META_ACCESS_TOKEN
        })
      });
      
      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);
      
      const containerId = containerData.id;

      // 2. Publish Media: POST /{ig-user-id}/media_publish
      url = `https://graph.facebook.com/v19.0/${META_IG_BUSINESS_ID}/media_publish`;
      payload = {
        creation_id: containerId,
        access_token: META_ACCESS_TOKEN
      };
    } else {
      // Facebook Graph API: POST /{page-id}/photos or /videos
      const endpoint = asset.format === "Video" ? "videos" : "photos";
      url = `https://graph.facebook.com/v19.0/${META_PAGE_ID}/${endpoint}`;
      payload = {
        url: asset.assetLink,
        message: `${asset.name} #TheSilentVeto`,
        access_token: META_ACCESS_TOKEN
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return {
      postId: data.id,
      postUrl: `https://facebook.com/${data.id}`,
      postedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`Meta API Error during ${platform} publish:`, err);
    throw err;
  }
}

/**
 * Publish video asset to YouTube Channels.
 * 
 * @param {Object} asset - Asset details
 * @returns {Promise<Object>} Video details (id, url, timestamp)
 */
export async function publishToYouTube(asset) {
  if (IS_SANDBOX) {
    console.log(`[YouTube API Sandbox] Uploading video "${asset.name}"...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (Math.random() < 0.05) {
      throw new Error(`[API Error] YouTube Data API returned Daily Upload Limit Exceeded (code: 403)`);
    }

    return {
      videoId: `mock_yt_${Date.now()}`,
      videoUrl: `https://youtube.com/watch?v=mock_video_${asset.assetId}`,
      postedAt: new Date().toISOString()
    };
  }

  // Real YouTube Data API v3 implementation
  // Requires uploading via a resumable multi-part upload endpoint
  try {
    const url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
    
    // Auth header requires OAuth client token from user login session
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${window.googleAccessToken}`, // set by OAuth flow
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        snippet: {
          title: asset.name,
          description: `${asset.name}\n\nPreorder The Silent Veto: https://amazon.com/dp/sample`,
          tags: ["The Silent Veto", "political thriller", "book teaser"]
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`YouTube API Error: ${errText}`);
    }

    // Capture upload URL and send media binary file...
    const data = await response.json();
    return {
      videoId: data.id,
      videoUrl: `https://youtube.com/watch?v=${data.id}`,
      postedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("YouTube API Error during upload:", err);
    throw err;
  }
}

/**
 * Pull analytics insights for a published post.
 */
export async function fetchPostAnalytics(platform, postId) {
  if (IS_SANDBOX) {
    return {
      likes: Math.floor(Math.random() * 500) + 120,
      reach: Math.floor(Math.random() * 8000) + 1500,
      views: platform === "YT" ? Math.floor(Math.random() * 15000) + 2000 : undefined,
      comments: Math.floor(Math.random() * 60) + 12
    };
  }

  try {
    if (platform === "IG") {
      // GET /{media-id}/insights?metric=engagement,impressions,reach,saved
      const res = await fetch(`https://graph.facebook.com/v19.0/${postId}/insights?metric=engagement,impressions,reach&access_token=${META_ACCESS_TOKEN}`);
      const data = await res.json();
      return {
        likes: data.data?.find(m => m.name === "engagement")?.values[0]?.value || 0,
        reach: data.data?.find(m => m.name === "reach")?.values[0]?.value || 0,
        comments: 0 // pulled from separate comments endpoint
      };
    } else if (platform === "FB") {
      // GET /{post-id}/insights/post_impressions_unique
      const res = await fetch(`https://graph.facebook.com/v19.0/${postId}/insights/post_impressions_unique?access_token=${META_ACCESS_TOKEN}`);
      const data = await res.json();
      return {
        reach: data.data?.[0]?.values?.[0]?.value || 0,
        likes: 0,
        comments: 0
      };
    } else if (platform === "YT") {
      // GET https://www.googleapis.com/youtube/v3/videos?id={id}&part=statistics
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${postId}&part=statistics&key=${YT_API_KEY}`);
      const data = await res.json();
      const stats = data.items?.[0]?.statistics || {};
      return {
        views: parseInt(stats.viewCount || 0, 10),
        likes: parseInt(stats.likeCount || 0, 10),
        comments: parseInt(stats.commentCount || 0, 10)
      };
    }
  } catch (err) {
    console.error(`Error pulling insights for ${platform}:`, err);
    return null;
  }
}
