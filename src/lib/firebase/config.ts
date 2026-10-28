import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, memoryLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
const isAlreadyInitialized = getApps().length > 0;
export const app = isAlreadyInitialized ? getApps()[0] : initializeApp(firebaseConfig);

// Auth and Firestore are used in Phase 2
// Storage will be imported on-demand in Phase 5
let authInstance: ReturnType<typeof getAuth> | any;
try {
  authInstance = getAuth(app);
} catch (error) {
  console.warn("Firebase Auth init failed (expected during Vercel build if env vars missing)");
}
export const auth = authInstance;

let firestoreDb;
try {
  if (isAlreadyInitialized) {
    firestoreDb = getFirestore(app);
  } else {
    if (typeof window !== 'undefined') {
      firestoreDb = initializeFirestore(app, {
        localCache: process.env.NODE_ENV === 'development' 
          ? memoryLocalCache() 
          : persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
    } else {
      firestoreDb = getFirestore(app);
    }
  }
} catch (e: any) {
  // Fallback if already initialized (e.g. during HMR or SSR)
  try {
    firestoreDb = getFirestore(app);
  } catch (err) {
    console.warn("Firestore init failed (expected during Vercel build if env vars missing)");
  }
}

export const db = firestoreDb as any;

