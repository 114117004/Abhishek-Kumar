"use client";

import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import app from "@/firebase/firebaseConfig";

export default function SignupPage() {
  const auth = getAuth(app);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("✅ Account created successfully!");
      setEmail("");
      setPassword("");
    } catch (error: any) {
      setMessage("❌ " + error.message);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSignup}
        className="bg-white p-6 rounded-2xl shadow-lg w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Sign Up</h2>

        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full mb-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
        >
          Create Account
        </button>

        {message && <p className="mt-3 text-center text-gray-700">{message}</p>}
      </form>
    </main>
  );
}
