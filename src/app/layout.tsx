"use client";

import "./globals.css";
import { Toaster } from "react-hot-toast";
import React from "react";

/**
 * Root layout for Poorwanchal Premier League App
 * This wraps every page and sets up global styles + toast notifications
 */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Poorwanchal Premier League</title>
        <meta
          name="description"
          content="Official Poorwanchal Premier League Web App"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-50 text-gray-900">
        {/* Global wrapper */}
        <div className="min-h-screen flex flex-col">
          {/* Page content */}
          <main className="flex-grow">{children}</main>

          {/* Footer */}
          <footer className="text-center py-4 text-sm text-gray-600 border-t">
            © {new Date().getFullYear()} Poorwanchal PL
          </footer>
        </div>

        {/* Toast notification system (global) */}
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              style: {
                background: "#10B981",
                color: "#fff",
              },
              iconTheme: {
                primary: "#fff",
                secondary: "#10B981",
              },
            },
            error: {
              style: {
                background: "#EF4444",
                color: "#fff",
              },
              iconTheme: {
                primary: "#fff",
                secondary: "#EF4444",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
