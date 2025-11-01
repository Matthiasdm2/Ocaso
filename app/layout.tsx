import "./globals.css";
// Global fetch patch to ensure relative /a      { url: "/placeholder.svg", sizes: "512x512" },i/* calls are absolutized on server
import "@/lib/ensureAbsoluteApiFetch";

import type { Metadata, Viewport } from "next";
import dynamic from 'next/dynamic';
import Script from 'next/script';
// Ensure Node.js runtime for this subtree (avoids Edge warnings for certain server libs)
export const runtime = 'nodejs';

import AuthSessionSync from "@/components/AuthSessionSync";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileFooter from "@/components/MobileFooter";
import { ToastProvider } from "@/components/Toast";
const ChatDockManager = dynamic(() => import('@/components/ChatDockManager'), { ssr: false });

// Normalize site URL: accept values without protocol (e.g. 'www.ocaso.be') and fall back safely
const rawSite = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ocaso.be").replace(/\/$/, "");
const normalizedSite = /^https?:\/\//i.test(rawSite) ? rawSite : `https://${rawSite}`;
let metadataBase: URL | undefined;
try {
  metadataBase = new URL(normalizedSite);
} catch {
  metadataBase = undefined;
}

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "OCASO — Slim tweedehands kopen en verkopen",
    template: "%s | OCASO",
  },
  description: "Marktplaats met AI-zoek en prijscontrole",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: normalizedSite,
    siteName: "OCASO",
    title: "OCASO — Slim tweedehands kopen en verkopen",
    description: "Marktplaats met AI-zoek en prijscontrole",
    images: [
      {
        url: "/placeholder.svg",
        width: 1200,
        height: 630,
        alt: "OCASO",
      },
    ],
    locale: "nl_BE",
  },
  twitter: {
    card: "summary_large_image",
    title: "OCASO — Slim tweedehands kopen en verkopen",
    description: "Marktplaats met AI-zoek en prijscontrole",
    images: ["/placeholder.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/placeholder.png", sizes: "512x512" },
    ],
  // apple icons removed
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Use default export of ConsentBootstrap (dynamic client component) via relative path to avoid TS path alias issue
const ConsentBootstrap = dynamic(() => import('../components/ConsentBootstrap'), { ssr: false });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="min-h-screen flex flex-col">
        <ToastProvider>
          <Header />
          <AuthSessionSync />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileFooter />
          <ChatDockManager />
          {/* Client bootstrap for consent-based loaders */}
          <ConsentBootstrap />
        </ToastProvider>
        {/* Inline script to dispatch initial prefs event after hydration */}
        <Script id="ocaso-consent-init" strategy="afterInteractive">
          {`(function(){try{const ev=new CustomEvent('ocaso:cookie-prefs-changed',{detail: (function(){try{return JSON.parse(decodeURIComponent((document.cookie.split('; ').find(r=>r.startsWith('ocaso_cookie_prefs='))||'').split('=').slice(1).join('=')))||{};}catch(e){return {};}})()});window.dispatchEvent(ev);}catch(e){}})();`}
        </Script>
      </body>
    </html>
  );
}

// (dynamic import verplaatst naar boven voor lint ordering)
