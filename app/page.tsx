"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Welcome to JobTrackAI
          </h1>
          <p className="mt-4 text-slate-600">
            Choisis une action pour tester rapidement les différentes
            fonctionnalités de l&apos;application.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/landing-page"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Go to Landing Page
          </Link>
          <Link
            href="/auth-test-page"
            className="px-6 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Go to Auth Test Page
          </Link>

          <Link
            href="/mail-connection-test-page"
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Go to Mail Connection Test Page
          </Link>
          <Link
            href="/scan-test-page"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
          >
            Go to Scan Test Page
          </Link>
        </div>
      </div>
    </main>
  );
}
