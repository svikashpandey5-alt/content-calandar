import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { generateCalendar } from "./scheduler";

const CONFIG_DOC_PATH = "config/settings";

export const DEFAULT_CONFIG = {
  scheduleStartDate: "2026-07-18",
  waYapEvery: 4,
  mainYapEvery: 2,
  otherBucketOrder: ["Animation", "Redacted", "Carousel", "Poster", "Review", "Final Line"],
  collisionAvoidance: true,
  autoPublishIG: true,
  autoPublishFB: true,
  autoPublishYT: true,
  bucketColors: {
    Carousel: { bg: "#D6E4FF", text: "#1A4B8C" },
    Poster: { bg: "#E9DDFB", text: "#5B3A9E" },
    Review: { bg: "#FFF1C2", text: "#8A6D00" },
    Redacted: { bg: "#E4E8EC", text: "#37474F" },
    "Final Line": { bg: "#FFE2CC", text: "#9A4E14" },
    Animation: { bg: "#FBD8E7", text: "#9A2A5C" },
    YAP: { bg: "#D6F1DA", text: "#1E6B39" }
  }
};

/**
 * Initialize config if not existing.
 */
export async function initConfig() {
  const docRef = doc(db, CONFIG_DOC_PATH);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  return snap.data();
}

/**
 * Get config document.
 */
export async function getConfig() {
  const docRef = doc(db, CONFIG_DOC_PATH);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : DEFAULT_CONFIG;
}

/**
 * Save config document.
 */
export async function updateConfig(newConfig) {
  const docRef = doc(db, CONFIG_DOC_PATH);
  await setDoc(docRef, newConfig, { merge: true });
}

/**
 * Get all assets.
 */
export async function getAllAssets() {
  const q = collection(db, "assets");
  const snap = await getDocs(q);
  const assets = [];
  snap.forEach(doc => {
    assets.push(doc.data());
  });
  return assets;
}

/**
 * Get all calendar days.
 */
export async function getCalendarDays() {
  const q = query(collection(db, "calendarDays"), orderBy("date", "asc"));
  const snap = await getDocs(q);
  const days = [];
  snap.forEach(doc => {
    days.push(doc.data());
  });
  return days;
}

/**
 * Add single asset with auto-sequencing transaction.
 */
export async function addAssetTransaction(bucket, name, format, assetLink, status = "Draft") {
  const counterRef = doc(db, "counters", bucket);
  const counterSnap = await getDoc(counterRef);
  
  let startSeq = 1;
  if (!counterSnap.exists()) {
    // Look up the highest seq from existing assets (if counters were wiped)
    const q = query(
      collection(db, "assets"),
      where("bucket", "==", bucket)
    );
    const snap = await getDocs(q);
    let maxSeq = 0;
    snap.forEach(doc => {
      const data = doc.data();
      if (data.seq && data.seq > maxSeq) {
        maxSeq = data.seq;
      }
    });
    startSeq = maxSeq + 1;
    // Seed counter
    await setDoc(counterRef, { seq: startSeq - 1 });
  }

  return runTransaction(db, async (transaction) => {
    const freshCounterSnap = await transaction.get(counterRef);
    const currentSeq = freshCounterSnap.exists() ? freshCounterSnap.data().seq : (startSeq - 1);
    const nextSeq = currentSeq + 1;
    const assetId = `${bucket}-${nextSeq}`;
    const assetDocRef = doc(db, "assets", assetId);

    const assetSnap = await transaction.get(assetDocRef);
    if (assetSnap.exists()) {
      throw new Error(`Asset ID ${assetId} already exists!`);
    }

    const newAsset = {
      assetId,
      bucket,
      seq: nextSeq,
      name: name || `${bucket} Content #${nextSeq}`,
      format,
      status,
      assetLink,
      dateAdded: new Date().toISOString(),
      postedOn: { IG: false, FB: false, LinkedIn: false, Snapchat: false, YT: false, WhatsApp: false },
      scheduledDate: { IG: null, FB: null, LinkedIn: null, Snapchat: null, YT: null, WhatsApp: null },
      analytics: { IG: null, FB: null, YT: null }
    };

    transaction.set(counterRef, { seq: nextSeq });
    transaction.set(assetDocRef, newAsset);

    return newAsset;
  });
}

/**
 * Edit or update an existing asset's details.
 */
export async function updateAsset(assetId, updatedFields) {
  const assetRef = doc(db, "assets", assetId);
  await updateDoc(assetRef, updatedFields);
}

/**
 * Delete or retire an asset from the system.
 */
export async function deleteAsset(assetId) {
  const assetRef = doc(db, "assets", assetId);
  await deleteDoc(assetRef);
}

/**
 * Bulk Import Assets with duplicates prevention check.
 * Validates against both database existing assets and file duplicates.
 */
export async function bulkImportAssets(assetsArray) {
  const existingAssets = await getAllAssets();
  const existingIds = new Set(existingAssets.map(a => a.assetId));
  
  const results = {
    imported: 0,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    errors: []
  };

  const fileSeenIds = new Set();
  const batch = writeBatch(db);
  const countersToUpdate = {}; // bucket -> maxSeq

  for (let i = 0; i < assetsArray.length; i++) {
    const row = assetsArray[i];
    const lineNum = i + 1;
    
    // Validation
    if (!row.assetId || !row.bucket || !row.format || !row.status) {
      results.skippedInvalid++;
      results.errors.push(`Row ${lineNum}: Missing required fields (assetId, bucket, format, status)`);
      continue;
    }

    const parts = row.assetId.split("-");
    const bucket = row.bucket;
    const seq = parseInt(parts[parts.length - 1], 10);

    if (parts.length < 2 || isNaN(seq) || parts[0] !== bucket) {
      results.skippedInvalid++;
      results.errors.push(`Row ${lineNum}: Invalid assetId format "${row.assetId}". Must match "{Bucket}-{number}"`);
      continue;
    }

    // Check duplicate
    if (existingIds.has(row.assetId) || fileSeenIds.has(row.assetId)) {
      results.skippedDuplicates++;
      results.errors.push(`Row ${lineNum}: Duplicate assetId "${row.assetId}" ignored`);
      continue;
    }

    fileSeenIds.add(row.assetId);

    const assetDoc = {
      assetId: row.assetId,
      bucket: row.bucket,
      seq: seq,
      name: row.name || `${row.bucket} Content #${seq}`,
      format: row.format,
      status: row.status,
      assetLink: row.assetLink || "",
      dateAdded: new Date().toISOString(),
      postedOn: {
        IG: row.postedOn?.IG || false,
        FB: row.postedOn?.FB || false,
        LinkedIn: row.postedOn?.LinkedIn || false,
        Snapchat: row.postedOn?.Snapchat || false,
        YT: row.postedOn?.YT || false,
        WhatsApp: row.postedOn?.WhatsApp || false
      },
      scheduledDate: { IG: null, FB: null, LinkedIn: null, Snapchat: null, YT: null, WhatsApp: null },
      analytics: { IG: null, FB: null, YT: null }
    };

    // Track highest sequence to update counters
    if (!countersToUpdate[bucket] || seq > countersToUpdate[bucket]) {
      countersToUpdate[bucket] = seq;
    }

    const assetRef = doc(db, "assets", row.assetId);
    batch.set(assetRef, assetDoc);
    results.imported++;
  }

  // Commit batch if there's any imported asset
  if (results.imported > 0) {
    await batch.commit();

    // Update counters for imported buckets
    const counterBatch = writeBatch(db);
    for (const [bucket, maxSeq] of Object.entries(countersToUpdate)) {
      const counterRef = doc(db, "counters", bucket);
      const counterSnap = await getDoc(counterRef);
      const currentVal = counterSnap.exists() ? counterSnap.data().seq : 0;
      if (maxSeq > currentVal) {
        counterBatch.set(counterRef, { seq: maxSeq });
      }
    }
    await counterBatch.commit();
  }

  return results;
}

/**
 * Re-runs scheduling algorithm and regenerates all calendarDays collection documents.
 */
export async function regenerateCalendarInDb() {
  const assets = await getAllAssets();
  const config = await getConfig();
  
  // Generate scheduling days using the pure algorithm
  const days = generateCalendar(assets, config);

  // 1. Delete all existing calendarDays documents
  const calendarDaysRef = collection(db, "calendarDays");
  const existingSnap = await getDocs(calendarDaysRef);
  
  const deleteBatch = writeBatch(db);
  existingSnap.forEach(doc => {
    deleteBatch.delete(doc.ref);
  });
  await deleteBatch.commit();

  // 2. Write new calendarDays documents (max 500 documents per batch)
  const saveBatch = writeBatch(db);
  days.forEach(day => {
    const docRef = doc(db, "calendarDays", day.date);
    saveBatch.set(docRef, day);
  });
  await saveBatch.commit();

  // 3. Update scheduledDate for all assets
  const updatedAssets = {};
  assets.forEach(asset => {
    updatedAssets[asset.assetId] = {
      ...asset,
      scheduledDate: { IG: null, FB: null, LinkedIn: null, Snapchat: null, YT: null, WhatsApp: null }
    };
  });

  days.forEach(day => {
    const dateStr = day.date;
    const platforms = ["IG", "FB", "LinkedIn", "Snapchat", "YT", "WhatsApp"];
    platforms.forEach(p => {
      const assetId = day[p];
      if (assetId && assetId !== "ALL CONTENT USED") {
        if (updatedAssets[assetId]) {
          updatedAssets[assetId].scheduledDate[p] = dateStr;
        }
      }
    });
  });

  // Commit updated assets back to database
  const assetBatch = writeBatch(db);
  Object.values(updatedAssets).forEach(asset => {
    const assetRef = doc(db, "assets", asset.assetId);
    assetBatch.set(assetRef, asset);
  });
  await assetBatch.commit();

  return days;
}
