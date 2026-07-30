import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generate platform-specific caption variants for a given asset.
 * 
 * @param {string} name - Title or name of the asset.
 * @param {string} bucket - The content bucket (e.g. YAP, Redacted, etc.)
 * @returns {Promise<Object>} Object containing instagram, linkedin, and casual captions.
 */
export async function generateCaptions(name, bucket) {
  // Try to load key from localStorage first, then fallback to env
  const apiKey = localStorage.getItem("TV_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please save it in Settings first.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use gemini-1.5-flash for fast text generation
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are a professional social media manager and copywriter working on a high-stakes book launch campaign.
    The book's working title is "The Silent Veto", which is a political thriller/mystery novel.
    
    You need to write platform-specific captions for a content asset.
    - Asset Name: "${name}"
    - Content Type/Bucket: "${bucket}"

    Provide your response strictly as a JSON object with the following keys:
    1. "instagram": A short, visually engaging caption. Must include emojis and 3-5 relevant hashtags (e.g., #TheSilentVeto, #ThrillerBooks).
    2. "linkedin": A professional and engaging caption. Focus on mystery, political intrigue, or writing insights. Suitable for a professional network.
    3. "casual": A casual, direct, conversational style caption. Perfect for a quick WhatsApp broadcast message to close contacts or a Snapchat overlay text. Keep it punchy and clear.

    Response JSON structure:
    {
      "instagram": "...",
      "linkedin": "...",
      "casual": "..."
    }
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini, raw response:", responseText);
    // Simple regex fallback if JSON parse fails
    return {
      instagram: `Check out our latest ${bucket} asset: ${name}! #TheSilentVeto #ThrillerNovel`,
      linkedin: `Excited to share the latest update from "The Silent Veto" campaign: ${name}. What do you think?`,
      casual: `Hey! Check out the new ${bucket} post for The Silent Veto: ${name}`
    };
  }
}

/**
 * Parses plain English instructions to update the schedule rules configuration.
 * 
 * @param {string} englishPrompt - Plain English scheduling command.
 * @param {Object} currentConfig - The active scheduler config.
 * @returns {Promise<Object>} Object containing updated config fields.
 */
export async function parseRulesWithAI(englishPrompt, currentConfig) {
  const apiKey = localStorage.getItem("TV_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please save it in Settings first.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are an expert system that parses natural language instructions for a content scheduler web application.
    Your job is to translate the user's instructions into structured configuration updates.
    
    Here is the schema of the configuration object:
    1. "scheduleStartDate": A string in YYYY-MM-DD format (representing when the schedule starts).
    2. "waYapEvery": A number representing the cadence of YAP postings on WhatsApp (e.g. 3 means every 3rd slot).
    3. "mainYapEvery": A number representing the cadence of YAP postings in the main calendar sequence (e.g. 2 means alternate slots, 3 means every 3rd slot).
    4. "otherBucketOrder": An array of strings representing the order of content buckets for the non-YAP round-robin distribution. Valid default buckets are "Animation", "Redacted", "Carousel", "Poster", "Review", "Final Line". But the user may specify a custom list or custom buckets. If they introduce a new bucket, keep it! Do not remove standard buckets unless the user implies they want to exclude them.
    5. "collisionAvoidance": A boolean indicating if WhatsApp collision avoidance is active (true/false).
    6. "autoPublishIG": A boolean indicating if Instagram auto-publishing is enabled (true/false).
    7. "autoPublishFB": A boolean indicating if Facebook auto-publishing is enabled (true/false).
    8. "autoPublishYT": A boolean indicating if YouTube auto-publishing is enabled (true/false).

    Here is the CURRENT configuration:
    ${JSON.stringify(currentConfig, null, 2)}

    Translate the following instruction into the updated configuration JSON. If the user doesn't mention one of the fields, keep the field's value from the CURRENT configuration.
    
    USER INSTRUCTION: "${englishPrompt}"

    Return ONLY a JSON object representing the UPDATED configuration fields that should be changed, or the full configuration. Ensure the keys are exact.
    
    Example response structure:
    {
      "scheduleStartDate": "2026-08-01",
      "waYapEvery": 5,
      "mainYapEvery": 3,
      "collisionAvoidance": false,
      "autoPublishIG": true,
      "autoPublishFB": false,
      "autoPublishYT": true,
      "otherBucketOrder": ["Carousel", "Review", "Animation", "Redacted", "Poster", "Final Line"]
    }
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini, raw response:", responseText);
    throw new Error("Gemini returned invalid JSON. Try phrasing your rule more clearly.");
  }
}
