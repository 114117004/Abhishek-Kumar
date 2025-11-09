"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-800">
        Poorwanchal Premier League Portal
      </h1>

      <div className="grid gap-4 text-lg">
        <Link href="/trials" className="text-blue-600 hover:underline">
          🏏 Trials & Matches
        </Link>
        <Link href="/team/register" className="text-blue-600 hover:underline">
          🧾 Team Registration
        </Link>
        <Link href="/team/players" className="text-blue-600 hover:underline">
          👥 Player List
        </Link>
        <Link href="/leaderboard" className="text-blue-600 hover:underline">
          🏆 Leaderboard
        </Link>
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          🔑 Admin Login
        </Link>
        <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
          🧭 Admin Dashboard
        </Link>
      </div>

      <footer className="mt-12 text-sm text-gray-600">
        © 2025 Poorwanchal PL
      </footer>
    </main>
  );
}
