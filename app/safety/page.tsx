"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  HelpCircle,
  Lock,
  MessageSquare,
  PackageCheck,
  Shield,
  ShieldCheck,
  Users2,
} from "lucide-react";
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

      {/* Escrow explainer */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
          <div className="flex items-center gap-2 text-emerald-700"><ShieldCheck className="h-5 w-5" /> Hoe werkt escrow‑betaling?</div>
          <ol className="mt-4 grid gap-4 text-sm text-neutral-800 md:grid-cols-4">
            <li className="rounded-xl border border-neutral-200 p-4">
              <div className="font-medium">1) Betaling</div>
              <p className="mt-1 text-neutral-600">Koper betaalt veilig op Ocaso. Het bedrag wordt tijdelijk vastgehouden.</p>
            </li>
            <li className="rounded-xl border border-neutral-200 p-4">
              <div className="font-medium">2) Verzending</div>
              <p className="mt-1 text-neutral-600">Verkoper verzendt met tracking via een Ocaso‑label voor bescherming.</p>
            </li>
            <li className="rounded-xl border border-neutral-200 p-4">
              <div className="font-medium">3) Ontvangst</div>
              <p className="mt-1 text-neutral-600">Koper controleert de bestelling en bevestigt wanneer alles in orde is.</p>
            </li>
            <li className="rounded-xl border border-neutral-200 p-4">
              <div className="font-medium">4) Uitbetaling</div>
              <p className="mt-1 text-neutral-600">Na bevestiging wordt de verkoper direct uitbetaald.</p>
            </li>
          </ol>
          <p className="mt-4 flex items-start gap-2 text-xs text-neutral-600"><Lock className="mt-0.5 h-4 w-4 text-emerald-600" /> Escrow beschermt beide partijen tegen niet‑levering, misverstanden en fraude.</p>
        </div>
      </section>

      {/* Scam prevention */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
            <div className="flex items-center gap-2 text-amber-800"><AlertTriangle className="h-5 w-5" /> Herken en voorkom fraude</div>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-amber-900">
              <li>Betaal of ontvang nooit geld buiten Ocaso. Deel geen QR‑codes of externe betaallinks.</li>
              <li>Klik niet op links die vragen om in te loggen buiten ocaso.be. Controleer altijd de URL.</li>
              <li>Te mooi om waar te zijn? Wees extra alert bij extreem lage prijzen of haast.</li>
              <li>Deel geen privégegevens (IBAN, e‑mail, telefoon) in chat. Gebruik alleen de Ocaso‑chat.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Shipping protection */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
          <div className="flex items-center gap-2 text-emerald-700"><PackageCheck className="h-5 w-5" /> Verzendbescherming & claims</div>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {["Verzend met tracking via Ocaso‑label", "Bewaar bewijs: label, afgiftebon, foto verpakking", "Meld problemen binnen 48u na bezorging"].map((t, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 p-4 text-sm text-neutral-700">
                <div className="text-neutral-900 font-medium">Stap {i + 1}</div>
                <p className="mt-1">{t}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-600">Bij vertraging, verlies of schade helpen we op basis van de tracking‑ en verzendgegevens.</p>
        </div>
      </section>

      {/* Privacy & chat */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-emerald-700"><MessageSquare className="h-5 w-5" /> Communiceer veilig</div>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Blijf in de Ocaso‑chat. Zo kunnen we je helpen bij geschillen.</li>
              <li>Deel geen persoonlijke contactgegevens of verificatiecodes.</li>
              <li>Rapporteer verdachte berichten via “Melden”.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-emerald-700"><HelpCircle className="h-5 w-5" /> Hulp nodig?</div>
            <p className="mt-3 text-sm text-neutral-700">Neem contact op via het <Link className="text-emerald-700 hover:underline" href="/support/new">supportformulier</Link>. Voeg je order‑ID en relevante screenshots toe voor een snelle afhandeling.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-10 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold md:text-3xl">Veelgestelde vragen</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="font-medium">Wanneer wordt de verkoper betaald?</div>
              <p className="mt-1 text-sm text-neutral-700">Na bevestigde levering door de koper of automatisch na de maximale beschermingsperiode.</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="font-medium">Kan ik ruilen of afhalen?</div>
              <p className="mt-1 text-sm text-neutral-700">Afhalen kan in overleg, maar voor bescherming adviseren we verzenden met tracking en betaling via Ocaso.</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="font-medium">Wat als mijn pakket vertraagd is?</div>
              <p className="mt-1 text-sm text-neutral-700">Controleer de tracking. Is er geen update? Neem contact op met support; we helpen met een onderzoek bij de vervoerder.</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="font-medium">Hoe meld ik fraude?</div>
              <p className="mt-1 text-sm text-neutral-700">Gebruik “Melden” in de chat of het <Link className="text-emerald-700 hover:underline" href="/support/new">supportformulier</Link> en voeg bewijs toe.</p>
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
