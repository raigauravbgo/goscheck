import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GosCheck — Website Intelligence Platform",
  description: "AI-powered website audit across 8 quality dimensions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
