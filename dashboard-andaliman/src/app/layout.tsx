import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Andaliman Storage - Dashboard",
  description: "Sistem kontrol lingkungan IoT untuk ruang penyimpanan andaliman",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={figtree.variable}>{children}</body>
    </html>
  );
}
