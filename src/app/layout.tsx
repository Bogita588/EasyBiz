import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerClient } from "@/components/service-worker-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyBiz | WhatsApp-smooth ERP",
  description:
    "Run your Nairobi SME like WhatsApp: one-tap actions, clear language, offline-first.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="app-shell">
          <header className="top-nav">
            <div className="nav-brand">
              <span className="nav-logo">EZ</span>
              <span className="nav-name">EasyBiz</span>
            </div>
            <nav className="nav-links">
              <Link href="/home">Home</Link>
              <Link href="/invoice/new">Sell</Link>
              <Link href="/invoices">Invoices</Link>
              <Link href="/customers">Customers</Link>
              <Link href="/suppliers">Suppliers</Link>
            </nav>
          </header>
          <div className="app-content">{children}</div>
        </div>
        {/* Registers the placeholder service worker; offline queueing will be wired in next stages. */}
        <ServiceWorkerClient />
      </body>
    </html>
  );
}
