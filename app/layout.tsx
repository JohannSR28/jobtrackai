import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobTrackAI",
  description: "Unified Platform for Job Applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        <AuthProvider
          fallback={
            <div
              style={{
                padding: 24,
                backgroundColor: "#f5f5f7",
                height: "100vh",
              }}
            >
              Chargement…
            </div>
          }
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
