/**
 * The Silent Veto Scheduling Algorithm.
 * Establishes a daily schedule starting from scheduleStartDate.
 * 
 * @param {Array} assets - All assets from the Firestore database.
 * @param {Object} config - Config parameters from the Firestore config singleton.
 * @returns {Array} List of calendarDay documents.
 */
export function generateCalendar(assets, config) {
  const {
    scheduleStartDate = "2026-07-18",
    waYapEvery = 4,
    otherBucketOrder = ["Animation", "Redacted", "Carousel", "Poster", "Review", "Final Line"]
  } = config || {};

  // 1. Filter Ready assets (ignore retired or other statuses)
  const readyAssets = assets.filter(a => a.status === "Ready");

  // 2. Separate YAP and non-YAP
  const yapAssets = readyAssets.filter(a => a.bucket === "YAP").sort((a, b) => a.seq - b.seq);
  
  // Group non-YAPs by bucket
  const nonYapByBucket = {};
  otherBucketOrder.forEach(b => {
    nonYapByBucket[b] = readyAssets
      .filter(a => a.bucket === b)
      .sort((a, b) => a.seq - b.seq);
  });

  // Build non-YAP sequence by round-robining through otherBucketOrder
  const nonYapSequence = [];
  let hasMoreNonYap = true;
  while (hasMoreNonYap) {
    hasMoreNonYap = false;
    for (const bucket of otherBucketOrder) {
      const bucketQueue = nonYapByBucket[bucket];
      if (bucketQueue && bucketQueue.length > 0) {
        nonYapSequence.push(bucketQueue.shift());
        hasMoreNonYap = true;
      }
    }
  }

  // Weave main sequence: alternate YAP, non-YAP
  const mainSequence = [];
  const yapQueue = [...yapAssets];
  const nonYapQueue = [...nonYapSequence];
  
  let toggle = true; // starts with YAP: YAP, other, YAP, other...
  while (yapQueue.length > 0 || nonYapQueue.length > 0) {
    if (toggle) {
      if (yapQueue.length > 0) {
        mainSequence.push(yapQueue.shift());
      } else if (nonYapQueue.length > 0) {
        mainSequence.push(nonYapQueue.shift());
      }
    } else {
      if (nonYapQueue.length > 0) {
        mainSequence.push(nonYapQueue.shift());
      } else if (yapQueue.length > 0) {
        mainSequence.push(yapQueue.shift());
      }
    }
    toggle = !toggle;
  }

  // Weave WhatsApp sequence: YAP appears only every waYapEvery-th slot
  const waYapQueue = [...yapAssets];
  const waNonYapQueue = [...nonYapSequence];
  const waRawSequence = [];
  
  let waIndex = 1;
  while (waYapQueue.length > 0 || waNonYapQueue.length > 0) {
    if (waIndex % waYapEvery === 0) {
      if (waYapQueue.length > 0) {
        waRawSequence.push(waYapQueue.shift());
      } else if (waNonYapQueue.length > 0) {
        waRawSequence.push(waNonYapQueue.shift());
      }
    } else {
      if (waNonYapQueue.length > 0) {
        waRawSequence.push(waNonYapQueue.shift());
      } else if (waYapQueue.length > 0) {
        waRawSequence.push(waYapQueue.shift());
      }
    }
    waIndex++;
  }

  // Platform queues (filter out assets already posted on that specific platform)
  const mainPlatforms = ["IG", "FB", "LinkedIn", "Snapchat", "YT"];
  const platformQueues = {};
  mainPlatforms.forEach(p => {
    const unposted = mainSequence.filter(a => !a.postedOn?.[p]);
    const normal = unposted.filter(a => !a.skippedOn?.[p]);
    const skipped = unposted.filter(a => !!a.skippedOn?.[p]);
    platformQueues[p] = [...normal, ...skipped];
  });
  
  // WhatsApp queue (filter out assets already posted on WhatsApp)
  const waUnposted = waRawSequence.filter(a => !a.postedOn?.WhatsApp);
  const waNormal = waUnposted.filter(a => !a.skippedOn?.WhatsApp);
  const waSkipped = waUnposted.filter(a => !!a.skippedOn?.WhatsApp);
  let waQueue = [...waNormal, ...waSkipped];

  // Walk the dates and schedule each platform
  const startDate = new Date(scheduleStartDate);
  const calendarDays = [];
  
  let dayOffset = 0;
  let maxDays = 500; // safety limit to prevent infinite loops
  
  while (maxDays > 0) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    
    // Format YYYY-MM-DD
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long" });

    // Check if all platforms are exhausted
    const allExhausted = mainPlatforms.every(p => platformQueues[p].length === 0) && waQueue.length === 0;
    if (allExhausted) {
      // Generate one final day showing exhaustion if we had days, or break
      if (dayOffset > 0) {
        break;
      }
    }

    const daySchedule = {
      date: dateStr,
      day: dayName,
      IG: null,
      FB: null,
      LinkedIn: null,
      Snapchat: null,
      YT: null,
      WhatsApp: null
    };

    const mainScheduledToday = new Set();

    mainPlatforms.forEach(p => {
      const q = platformQueues[p];
      if (q.length > 0) {
        const asset = q[0];
        daySchedule[p] = asset.assetId;
        mainScheduledToday.add(asset.assetId);
      } else {
        daySchedule[p] = "ALL CONTENT USED";
      }
    });

    // Schedule WhatsApp with collision avoidance
    if (waQueue.length > 0) {
      let foundIndex = -1;
      for (let i = 0; i < waQueue.length; i++) {
        if (!mainScheduledToday.has(waQueue[i].assetId)) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        const asset = waQueue[foundIndex];
        daySchedule.WhatsApp = asset.assetId;
        waQueue.splice(foundIndex, 1); // remove scheduled item
      } else {
        // If everything remaining in WA queue collides with main platforms today
        daySchedule.WhatsApp = "ALL CONTENT USED";
      }
    } else {
      daySchedule.WhatsApp = "ALL CONTENT USED";
    }

    // Advance main queues
    mainPlatforms.forEach(p => {
      const q = platformQueues[p];
      if (q.length > 0) {
        q.shift();
      }
    });

    calendarDays.push(daySchedule);
    dayOffset++;
    maxDays--;
  }

  return calendarDays;
}
