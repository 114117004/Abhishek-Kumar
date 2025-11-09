import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Poorwanchal Premier League",
  description: "Official Web Portal for the Poorwanchal Premier League",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800">
        {/* 🌟 Sticky Navigation Bar */}
        <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 z-50">
          <nav className="max-w-7xl mx-auto flex items-center justify-between p-4">
            <Link href="/" className="text-xl font-bold text-indigo-700 hover:text-indigo-900">
              🏏 Poorwanchal PL
            </Link>

            <div className="flex gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-indigo-600">Home</Link>
              <Link href="/trials" className="hover:text-indigo-600">Trials</Link>
              <Link href="/leaderboard" className="hover:text-indigo-600">Leaderboard</Link>
              <Link href="/team/register" className="hover:text-indigo-600">Register Team</Link>
              <Link href="/auth/login" className="hover:text-indigo-600">Admin</Link>
            </div>
          </nav>
        </header>

        {/* 📦 Page Content */}
        <main className="pt-24 px-6 sm:px-12">{children}</main>

        {/* ⚓ Footer */}
        <footer className="mt-20 py-6 text-center text-gray-500 text-sm border-t border-gray-200">
          © 2025 Poorwanchal Premier League | All Rights Reserved
        </footer>
      </body>
    </html>
  );
}
