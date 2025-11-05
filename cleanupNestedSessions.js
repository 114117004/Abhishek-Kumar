// cleanupNestedSessions.js
import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!fs.existsSync("./serviceAccountKey.json")) {
  console.error("❌ Missing serviceAccountKey.json in project root.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function cleanup() {
  const teamsSnap = await db.collection("teams").get();
  console.log(`Found ${teamsSnap.size} teams. Scanning nested sessions...`);
  let deleted = 0;
  let skipped = 0;

  for (const teamDoc of teamsSnap.docs) {
    const teamId = teamDoc.id;
    const sessionsSnap = await db.collection("teams").doc(teamId).collection("sessions").get();
    if (sessionsSnap.empty) continue;

    for (const s of sessionsSnap.docs) {
      const id = s.id;
      const topSnap = await db.collection("sessions").doc(id).get();

      if (!topSnap.exists) {
        console.log(`Skipped (no top-level copy): teams/${teamId}/sessions/${id}`);
        skipped++;
        continue;
      }

      await db.collection("teams").doc(teamId).collection("sessions").doc(id).delete();
      console.log(`✅ Deleted: teams/${teamId}/sessions/${id}`);
      deleted++;
    }
  }

  console.log(`\nDone ✅ Deleted: ${deleted}, Skipped: ${skipped}`);
}

cleanup().catch((err) => console.error("Error during cleanup:", err));
