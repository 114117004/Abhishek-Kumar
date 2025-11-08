"use client";

import React from "react";
import { getFirestore, collection, addDoc } from "firebase/firestore";

export default function TestImportPage() {
  console.log("getFirestore type:", typeof getFirestore);
  console.log("collection type:", typeof collection);
  console.log("addDoc type:", typeof addDoc);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "1.2rem",
      }}
    >
      <p>✅ Firebase Firestore import test page</p>
      <p>Check your browser console (F12 → Console tab)</p>
    </div>
  );
}
