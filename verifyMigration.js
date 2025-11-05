// verifyMigration.js
import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!fs.existsSync("./serviceAccountKey.json")) {
  console.error("Missing serviceAccountKey.json in project root. Stop.");
  process.exit(2);
}

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function verify() {
  const teamsSnap = await db.collection("teams").get();
  console.log(`Found ${teamsSnap.size} teams. Checking nested sessions...`);
  const missing = [];
  const mismatched = [];

  for (const teamDoc of teamsSnap.docs) {
    const teamId = teamDoc.id;
    const sessionsSnap = await db.collection("teams").doc(teamId).collection("sessions").get();
    if (sessionsSnap.empty) continue;
    for (const s of sessionsSnap.docs) {
      const id = s.id;
      const nestedData = s.data();
      const topDocRef = db.collection("sessions").doc(id);
      const topSnap = await topDocRef.get();
      if (!topSnap.exists) {
        missing.push({ teamId, sessionId: id });
      } else {
        const topData = topSnap.data();
        // quick shallow comparison of field keys (you can extend as needed)
        const nestedKeys = Object.keys(nestedData).sort().join(",");
        const topKeys = Object.keys(topData || {}).sort().join(",");
        if (nestedKeys !== topKeys) {
          mismatched.push({ teamId, sessionId: id, nestedKeys, topKeys });
        }
      }
    }
  }

  console.log("");
  if (missing.length === 0 && mismatched.length === 0) {
    console.log("✅ Verification passed: all nested sessions have matching top-level documents (no mismatches).");
    process.exit(0);
  } else {
    if (missing.length) {
      console.log(`❌ Missing top-level sessions for ${missing.length} nested docs:`);
      missing.slice(0, 50).forEach(m => console.log(` - teams/${m.teamId}/sessions/${m.sessionId}`));
    }
    if (mismatched.length) {
      console.log(`⚠️ ${mismatched.length} docs appear mismatched (field keys differ). Examples:`);
      mismatched.slice(0, 20).forEach(m => console.log(` - teams/${m.teamId}/sessions/${m.sessionId}\n    nestedKeys: ${m.nestedKeys}\n    topKeys:    ${m.topKeys}`));
    }
    console.log("\nFix the missing/mismatched docs before running cleanup. Exiting with code 3.");
    process.exit(3);
  }
}

verify().catch(err => {
  console.error("Error during verification:", err);
  process.exit(4);
});
