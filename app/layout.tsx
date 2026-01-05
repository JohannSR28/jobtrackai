import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
