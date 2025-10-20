"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, BadgeCheck, CreditCard, PackageCheck, Shield, Users2 } from "lucide-react";
import Link from "next/link";

/*
  Save as: app/safety/page.tsx
  Purpose: Trust & safety page (crucial for building confidence with buyers and sellers)
  Style: Light, professional, clear structure, emerald accents
*/

export default function SafetyPage() {
  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <Shield className="h-4 w-4" /> Veilig handelen
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Samen zorgen we voor vertrouwen</h1>
            <p className="mt-3 max-w-3xl text-lg text-neutral-700 md:text-xl">
              Ocaso is gebouwd op veiligheid en transparantie. We beschermen kopers en verkopers met escrow‑betalingen, geverifieerde profielen, reviews en ingebouwde chat.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            { icon: CreditCard, title: "Escrow‑betalingen", desc: "Geld staat in veilige bewaring tot de levering is bevestigd. Geen vooruitbetaling buiten het platform." },
            { icon: PackageCheck, title: "Verzending met tracking", desc: "Verzend via Ocaso‑labels met tracking. Ondersteuning bij vertraging, verlies of schade." },
            { icon: BadgeCheck, title: "Geverifieerde profielen", desc: "Zakelijke verkopers doorlopen extra checks (KYC). Iedereen bouwt reputatie op via reviews." },
          ].map((p, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <p.icon className="h-6 w-6 text-emerald-600" />
              <div className="mt-3 font-medium text-lg">{p.title}</div>
              <div className="mt-1 text-sm text-neutral-600">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Buyer & Seller Tips */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold md:text-3xl">Tips voor veilig handelen</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 text-emerald-700"><Users2 className="h-5 w-5" /> Voor kopers</div>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-neutral-700">
                <li>Betaal altijd via Ocaso (escrow) — nooit buiten het platform.</li>
                <li>Controleer reviews, badges en eventuele bedrijfsverificatie.</li>
                <li>Houd alle communicatie binnen de Ocaso‑chat.</li>
                <li>Bevestig levering pas als je item ontvangen en in orde is.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 text-emerald-700"><Users2 className="h-5 w-5" /> Voor verkopers</div>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-neutral-700">
                <li>Gebruik een Ocaso‑verzendlabel voor tracking en bescherming.</li>
                <li>Reageer via de ingebouwde chat en houd afspraken in de app.</li>
                <li>Accepteer alleen betalingen via Ocaso (escrow), niet extern.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Reporting / Support */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-5xl rounded-2xl border border-neutral-200 bg-white p-6 md:p-10">
          <div className="flex items-center gap-2 text-emerald-700"><AlertCircle className="h-5 w-5" /> Problemen melden</div>
          <p className="mt-2 text-neutral-700 text-sm md:text-base">
            Probleem of vermoeden van fraude? Meld dit via het <Link href="/support/new" className="text-emerald-700 hover:underline">supportformulier</Link>. Voeg order‑ID, chat‑screenshots en verzendbewijs toe. Wij bekijken je case en ondernemen actie.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-semibold md:text-3xl">Vertrouwen als fundament</h3>
                <p className="mt-2 text-neutral-700">Samen maken we van Ocaso een veilig en betrouwbaar ecosysteem. Handel met vertrouwen en focus op wat echt telt.</p>
              </div>
              <div className="md:text-right">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                  Word verkoper <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
