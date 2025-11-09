"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export default function Home() {
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    sessions: 0,
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const teams = await getDocs(collection(db, "teams"));
        const players = await getDocs(collection(db, "players"));
        const sessions = await getDocs(collection(db, "sessions"));
        setStats({
          teams: teams.size,
          players: players.size,
          sessions: sessions.size,
        });
      } catch (err) {
        console.error("Error loading stats:", err);
      }
    };
    loadCounts();
  }, []);

  const links = [
    {
      section: "Player & Team",
      items: [
        { href: "/team/register", label: "🧾 Team Registration", desc: `${stats.teams} teams registered` },
        { href: "/team/players", label: "👥 Player List", desc: `${stats.players} players registered` },
        { href: "/trials", label: "🏏 Trials & Matches", desc: `${stats.sessions} upcoming sessions` },
        { href: "/trials/signup", label: "📝 Player Signup for Trials", desc: "Register for upcoming trials" },
      ],
    },
    {
      section: "Admin Area",
      items: [
        { href: "/admin/dashboard", label: "🧭 Dashboard", desc: "Full system control" },
        { href: "/admin/qr", label: "📱 QR Generator", desc: "Generate player QR codes" },
        { href: "/admin/scan", label: "🎫 Scan Attendance", desc: "Mark check-ins via QR" },
        { href: "/admin/scheduler", label: "🗓 Scheduler", desc: "Manage trial sessions" },
        { href: "/admin/import", label: "📥 Import Data", desc: "Bulk upload players" },
        { href: "/admin/sessions", label: "🕓 Manage Sessions", desc: "Edit and review sessions" },
        { href: "/admin/checkedin", label: "✅ Checked-in Players", desc: "View attendance logs" },
      ],
    },
    {
      section: "Public Info",
      items: [
        { href: "/leaderboard", label: "🏆 Leaderboard", desc: "Top teams and players" },
        { href: "/auth/login", label: "🔑 Admin Login", desc: "Access admin tools" },
        { href: "/auth/signup", label: "🧑‍💻 Create Admin Account", desc: "New admin registration" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100 flex flex-col items-center p-8">
      <h1 className="text-4xl font-extrabold text-indigo-800 mb-10 text-center">
        Poorwanchal Premier League Portal
      </h1>

      <div className="w-full max-w-6xl flex flex-col gap-10">
        {links.map((group) => (
          <div key={group.section}>
            <h2 className="text-2xl font-semibold text-indigo-700 mb-4 border-b border-indigo-300 pb-1">
              {group.section}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="p-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow border border-gray-100 hover:border-indigo-300 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-700 mb-2">{link.label}</h3>
                    <p className="text-gray-600 text-sm">{link.desc}</p>
                  </div>
                  <span className="mt-3 text-indigo-500 text-sm font-medium hover:underline">
                    Visit →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-12 text-gray-600 text-sm">
        © 2025 Poorwanchal Premier League
      </footer>
    </div>
  );
}
