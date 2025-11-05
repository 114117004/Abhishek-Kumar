"use client";

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import app, { db } from "@/firebase/firebaseConfig";
import { QRCodeCanvas } from "qrcode.react"; // ✅ Correct import

export default function TrialSignupPage() {
  const [form, setForm] = useState({
    name: "",
    aadhaar: "",
    age: "",
    zone: "",
    role: "",
  });
  const [message, setMessage] = useState("");
  const [trialId, setTrialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Aadhaar validation (12 digits)
  const isValidAadhaar = (aadhaar: string) => /^\d{12}$/.test(aadhaar);

  // Age validation (16–40)
  const isValidAge = (age: string) => {
    const num = parseInt(age);
    return num >= 16 && num <= 40;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setTrialId(null);

    if (!form.name || !form.aadhaar || !form.zone || !form.role || !form.age) {
      setMessage("⚠️ Please fill all fields.");
      return;
    }

    if (!isValidAadhaar(form.aadhaar)) {
      setMessage("❌ Invalid Aadhaar number. Must be 12 digits.");
      return;
    }

    if (!isValidAge(form.age)) {
      setMessage("❌ Age must be between 16 and 40.");
      return;
    }

    try {
      setLoading(true);
      const newTrialId = `TRIAL-${Date.now().toString().slice(-6)}`;

      await addDoc(collection(db, "trials"), {
        ...form,
        trialId: newTrialId,
        createdAt: serverTimestamp(),
        checkedIn: false,
      });

      setMessage(`✅ Registered successfully! Your Trial ID: ${newTrialId}`);
      setTrialId(newTrialId);
      setForm({ name: "", aadhaar: "", age: "", zone: "", role: "" });
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to register. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg p-6 rounded-xl w-full max-w-md border border-gray-200"
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">
          🏏 Trial Signup
        </h2>

        <input
          type="text"
          placeholder="Full Name"
          className="border p-2 w-full mb-3 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          type="text"
          placeholder="Aadhaar Number (12 digits)"
          className="border p-2 w-full mb-3 rounded"
          value={form.aadhaar}
          onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
          required
        />

        <input
          type="number"
          placeholder="Age (16–40)"
          className="border p-2 w-full mb-3 rounded"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          required
        />

        <select
          value={form.zone}
          onChange={(e) => setForm({ ...form, zone: e.target.value })}
          className="border p-2 w-full mb-3 rounded"
          required
        >
          <option value="">Select Zone</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
        </select>

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="border p-2 w-full mb-3 rounded"
          required
        >
          <option value="">Select Role</option>
          <option value="Batsman">Batsman</option>
          <option value="Bowler">Bowler</option>
          <option value="All-rounder">All-rounder</option>
          <option value="Wicketkeeper">Wicketkeeper</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded transition ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? "Registering..." : "Register for Trial"}
        </button>

        {message && (
          <p className="mt-3 text-center text-sm font-medium text-gray-700">
            {message}
          </p>
        )}
      </form>

      {/* ✅ Show QR Code on success */}
      {trialId && (
        <div className="mt-6 text-center bg-white p-4 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-green-700">
            🎫 Your Trial QR Code
          </h3>
          <QRCodeCanvas value={trialId} size={180} />
          <p className="text-sm text-gray-600 mt-2">Trial ID: {trialId}</p>
          <p className="text-xs text-gray-500">
            Please screenshot or save this QR code. You'll need it for ground verification.
          </p>
        </div>
      )}
    </main>
  );
}
