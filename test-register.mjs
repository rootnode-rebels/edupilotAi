import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK77523U2xVWXmhIVZs6pCFxgcW3GdFtU",
  authDomain: "edupilot-a.firebaseapp.com",
  projectId: "edupilot-a",
  storageBucket: "edupilot-a.firebasestorage.app",
  messagingSenderId: "42084986062",
  appId: "1:42084986062:web:5eb4686ae31a6e9a95b49f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    const email = `teststudent${Date.now()}@example.com`;
    const password = "Password123!";
    console.log("Registering:", email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("Auth user created:", user.uid);

    const newProfile = {
      uid: user.uid,
      email: email,
      displayName: "Test Student",
      role: "student",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      studentId: "EDU-12345678"
    };

    console.log("Setting doc with merge: true");
    await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
    console.log("SetDoc successful!");

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    console.log("GetDoc exists:", userDoc.exists());
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

test();
