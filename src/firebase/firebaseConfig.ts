// src/firebase/firebaseConfig.ts  (DEBUG / temporary)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6Cde-3BsaJZ--X5IkRhJZ27AHeT2X1sg",
  authDomain: "poorwanchalpremierleague-bcfad.firebaseapp.com",
  projectId: "poorwanchalpremierleague-bcfad",
  storageBucket: "poorwanchalpremierleague-bcfad.appspot.com", // use appspot.com style
  messagingSenderId: "497008463035",
  appId: "1:497008463035:web:51c90ce1b86a07b43e6d9e"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

