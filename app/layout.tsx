import "./globals.css";
// Global fetch patch to ensure relative /api/* calls are absolutized on server
import "@/lib/ensureAbsoluteApiFetch";

import type { Metadata } from "next";
import dynamic from 'next/dynamic';
import Script from 'next/script';

import AuthSessionSync from "@/components/AuthSessionSync";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/Toast";
const ChatDockManager = dynamic(() => import('@/components/ChatDockManager'), { ssr: false });

export const metadata: Metadata = {
  title: "OCASO — Slim tweedehands kopen en verkopen",
  description: "Marktplaats met AI-zoek en prijscontrole",
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
          <main className="flex-1">{children}</main>
          <Footer />
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
