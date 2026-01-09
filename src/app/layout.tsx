import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerClient } from "@/components/service-worker-client";
import { PerformanceGuard } from "@/components/performance-guard";
import { TenantStatusGuard } from "@/components/tenant-status-guard";
import SecurityFooter from "@/components/security-footer";
import { AppHeader } from "@/components/app-header";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyBiz | Calm ERP for SMEs",
  description: "Run your Nairobi SME with one-tap actions, clear language, offline-first.",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialRole: "ADMIN" | "OWNER" | "MANAGER" | "ATTENDANT" | undefined = undefined;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("ez_session")?.value;
    if (raw) {
      const decoded = (() => {
        try {
          return Buffer.from(decodeURIComponent(raw), "base64").toString("utf8");
        } catch {
          try {
            return Buffer.from(raw, "base64").toString("utf8");
          } catch {
            return "";
          }
        }
      })();
      const parsed = JSON.parse(decoded);
      const role = (parsed?.role || "").toUpperCase();
      if (role === "ADMIN" || role === "OWNER" || role === "MANAGER" || role === "ATTENDANT") {
        initialRole = role;
      }
    }
  } catch {
    initialRole = undefined;
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-role={initialRole ?? ""}
      >
        <div className="app-shell">
          <AppHeader initialRole={initialRole} />
          <div className="app-content">
            {children}
            <SecurityFooter />
          </div>
        </div>
        {/* Registers the placeholder service worker; offline queueing will be wired in next stages. */}
        <ServiceWorkerClient />
        <PerformanceGuard />
        <TenantStatusGuard />
      </body>
    </html>
  );
}
