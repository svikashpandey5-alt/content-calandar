import { db } from "../firebase";
import { doc, writeBatch, setDoc } from "firebase/firestore";
import { DEFAULT_CONFIG } from "./db";

/**
 * Seed the Firestore database with the specified counts of mock assets, config settings, and counters.
 */
export async function seedDatabase(counts = {
  Carousel: 15,
  Poster: 15,
  Review: 10,
  Redacted: 10,
  "Final Line": 10,
  Animation: 15,
  YAP: 20
}) {
  const batch = writeBatch(db);
  const formats = {
    Carousel: "Static",
    Poster: "Static",
    Review: "Static",
    Redacted: "Static",
    "Final Line": "Static",
    Animation: "Video",
    YAP: "Video"
  };

  const statuses = ["Ready", "Ready", "Ready", "Draft", "In Production"]; // mostly ready to test the scheduler

  // 1. Seed Config Singleton
  const configRef = doc(db, "config", "settings");
  batch.set(configRef, DEFAULT_CONFIG);

  // 2. Seed Counters & Assets
  let totalAssets = 0;
  for (const [bucket, count] of Object.entries(counts)) {
    // Seed counter document
    const counterRef = doc(db, "counters", bucket);
    batch.set(counterRef, { seq: count });

    // Seed asset documents
    for (let seq = 1; seq <= count; seq++) {
      const assetId = `${bucket}-${seq}`;
      const assetRef = doc(db, "assets", assetId);
      
      const randStatus = statuses[(seq + totalAssets) % statuses.length];
      
      const asset = {
        assetId,
        bucket,
        seq,
        name: `${bucket} Sample Asset #${seq}`,
        format: formats[bucket] || "Static",
        status: randStatus,
        assetLink: "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
        dateAdded: new Date().toISOString(),
        postedOn: { IG: false, FB: false, LinkedIn: false, Snapchat: false, YT: false, WhatsApp: false },
        scheduledDate: { IG: null, FB: null, LinkedIn: null, Snapchat: null, YT: null, WhatsApp: null },
        analytics: { IG: null, FB: null, YT: null }
      };

      batch.set(assetRef, asset);
      totalAssets++;
    }
  }

  await batch.commit();
  return totalAssets;
}
