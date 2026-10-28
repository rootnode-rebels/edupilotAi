const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAK77523U2xVWXmhIVZs6pCFxgcW3GdFtU",
  authDomain: "edupilot-a.firebaseapp.com",
  projectId: "edupilot-a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INVALID_NAMES_LOWER = [
  'edupilot ai', 'demo workflow', 'demo course', 'sample topic',
  'test concept', 'untitled topic', 'duplicate'
];

async function runCleanup() {
  console.log("Starting Concept Cleanup script using temporary bypass...");
  
  try {
    const snapshot = await getDocs(collection(db, 'concepts'));
    let total = 0;
    let toMark = 0;
    
    // courseId -> Set of lowercase concept names
    const courseConcepts = new Map();
    const updates = [];

    snapshot.forEach(docSnap => {
      total++;
      const data = docSnap.data();
      const courseId = data.courseId || 'unknown';
      const name = (data.name || '').trim();
      const nameLower = name.toLowerCase().replace(/\s+/g, ' ');
      
      let invalid = false;
      
      if (!name) {
        invalid = true;
      } else if (INVALID_NAMES_LOWER.some(invalidName => nameLower.includes(invalidName))) {
        invalid = true;
      }
      
      if (!courseConcepts.has(courseId)) {
        courseConcepts.set(courseId, new Set());
      }
      const existing = courseConcepts.get(courseId);

      if (!invalid) {
        if (existing.has(nameLower)) {
          invalid = true;
          console.log(`[DUPLICATE] Concept ID: ${docSnap.id} | Name: "${name}" in Course: ${courseId}`);
        } else {
          existing.add(nameLower);
        }
      } else {
         console.log(`[INVALID] Concept ID: ${docSnap.id} | Name: "${name}" in Course: ${courseId}`);
      }
      
      if (invalid && data.status !== 'archived' && data.status !== 'invalid') {
        toMark++;
        updates.push({ docRef: doc(db, 'concepts', docSnap.id) });
      }
    });

    console.log(`Found ${toMark} concepts to mark as invalid out of ${total} total concepts.`);
    
    if (toMark > 0) {
      console.log("Applying updates...");
      let batch = writeBatch(db);
      let batchCount = 0;
      
      for (const update of updates) {
        batch.update(update.docRef, { status: 'invalid' });
        batchCount++;
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      console.log("Updates applied successfully.");
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

runCleanup();
