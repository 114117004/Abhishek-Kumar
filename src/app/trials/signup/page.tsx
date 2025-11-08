"use client";

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import app, { db } from "@/firebase/firebaseConfig";
import { QRCodeCanvas } from "qrcode.react";
import toast from "react-hot-toast";

export default function TrialSignupPage() {
  const [form, setForm] = useState({
    name: "",
    aadhaar: "",
    age: "",
    zone: "",
    role: "",
  });
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

    if (!isValidAadhaar(form.aadhaar)) {
      toast.error("Please enter a valid 12-digit Aadhaar number ❌");
      return;
    }
    if (!isValidAge(form.age)) {
      toast.error("Age must be between 16 and 40 ❌");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "trials"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      toast.success("Trial registered successfully ✅");
      setForm({ name: "", aadhaar: "", age: "", zone: "", role: "" });
    } catch (error) {
      console.error("Error adding document:", error);
      toast.error("Something went wrong. Please try again ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col justify-between min-h-screen bg-gray-50">
      {/* Centered Form */}
      <div className="flex flex-col items-center justify-center flex-grow px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md border border-gray-200"
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-purple-800">
            🏏 Trial Signup
          </h2>

          {/* Stack all fields vertically */}
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <input
              type="text"
              placeholder="Aadhaar Number (12 digits)"
              value={form.aadhaar}
              onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <input
              type="number"
              placeholder="Age (16–40)"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <select
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none"
              required
            >
              <option value="">Select Zone</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="North">North</option>
              <option value="South">South</option>
            </select>

            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-400 outline-none"
              required
            >
              <option value="">Select Role</option>
              <option value="Batsman">Batsman</option>
              <option value="Bowler">Bowler</option>
              <option value="All-Rounder">All-Rounder</option>
              <option value="Wicket Keeper">Wicket Keeper</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded text-white font-medium transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Registering..." : "Register for Trial"}
            </button>
          </div>
        </form>

        {/* Optional QR preview */}
        {form.name && (
          <div className="mt-6 p-4 bg-white shadow rounded">
            <h3 className="font-semibold mb-2 text-center">QR Preview</h3>
            <QRCodeCanvas value={JSON.stringify(form)} size={128} />
          </div>
        )}
      </div>

      {/* Center footer */}
      <footer className="text-center py-4 text-gray-600 border-t">
        © {new Date().getFullYear()} Poorwanchal Premier League
      </footer>
    </main>
  );
}
