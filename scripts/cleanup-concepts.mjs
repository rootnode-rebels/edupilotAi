import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve('.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INVALID_NAMES_LOWER = [
    'edupilot ai', 'demo workflow', 'demo course', 'sample topic',
    'test concept', 'untitled topic', 'duplicate'
];

async function runCleanup(dryRun = true) {
    console.log(`Starting Concept Cleanup... (Dry Run: ${dryRun})`);
    const snapshot = await getDocs(collection(db, 'concepts'));
    
    let total = 0;
    let toMark = 0;
    
    const updates = [];
    const courseConcepts = new Map(); // CourseId -> Set of normalized names
    
    snapshot.forEach(docSnap => {
        total++;
        const data = docSnap.data();
        const name = (data.name || '').trim();
        const nameLower = name.toLowerCase().replace(/\s+/g, ' ');
        const courseId = data.courseId;
        
        let invalid = false;
        
        // 1. Check for empty or invalid names
        if (!name) {
            invalid = true;
        } else if (INVALID_NAMES_LOWER.some(invalidName => nameLower.includes(invalidName))) {
            invalid = true;
        }
        
        // 2. Check for duplicates within the same course
        if (!invalid && courseId) {
            if (!courseConcepts.has(courseId)) {
                courseConcepts.set(courseId, new Set());
            }
            const courseSet = courseConcepts.get(courseId);
            if (courseSet.has(nameLower)) {
                invalid = true;
                console.log(`[DUPLICATE] Concept ID: ${docSnap.id} | Name: "${name}" | Course: ${courseId}`);
            } else {
                courseSet.add(nameLower);
            }
        }
        
        if (invalid && data.status !== 'archived' && data.status !== 'invalid') {
            toMark++;
            if (!courseConcepts.get(courseId)?.has(nameLower) || !name) {
                console.log(`[INVALID] Concept ID: ${docSnap.id} | Name: "${name}" | Course: ${courseId}`);
            }
            updates.push({ docRef: doc(db, 'concepts', docSnap.id), data });
        }
    });
    
    console.log(`\nFound ${toMark} invalid or duplicate concepts out of ${total} total concepts.`);
    
    if (dryRun) {
        console.log('Run with --execute to perform updates.');
    } else {
        console.log('Applying updates (marking as invalid)...');
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
        console.log('Updates applied successfully.');
    }
}

const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

runCleanup(isDryRun).catch(console.error);
