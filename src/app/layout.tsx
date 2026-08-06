import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Immo",
  description: "Recherche et analyse de biens locatifs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-zinc-950 text-zinc-200 antialiased">{children}</body>
    </html>
  );
}
