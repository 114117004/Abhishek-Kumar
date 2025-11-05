// migrateSessions.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// ⚠️ You need your Firebase Admin SDK private key JSON (service account key)
// Download from Firebase Console → Project Settings → Service Accounts → Generate new private key
// Save as "serviceAccountKey.json" in your project root

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrateSessions() {
  const teamsSnap = await db.collection("teams").get();
  console.log(`Found ${teamsSnap.size} teams.`);

  let migratedCount = 0;

  for (const teamDoc of teamsSnap.docs) {
    const teamId = teamDoc.id;
    const sessionsRef = db.collection("teams").doc(teamId).collection("sessions");
    const sessionsSnap = await sessionsRef.get();

    for (const s of sessionsSnap.docs) {
      const data = s.data();
      const newDoc = db.collection("sessions").doc(s.id); // keep same ID if desired
      await newDoc.set({
        ...data,
        teamId, // optional trace field
        migratedFrom: `teams/${teamId}/sessions/${s.id}`,
      });
      migratedCount++;
    }
  }

  console.log(`✅ Migration complete. Migrated ${migratedCount} sessions to top-level "sessions" collection.`);
}

migrateSessions().catch((err) => console.error("Migration error:", err));
