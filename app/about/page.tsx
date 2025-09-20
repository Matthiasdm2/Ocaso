"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Rocket,
  Shield,
  Sparkles,
  Store,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

/*
  Save as: app/investors/page.tsx
  Style: Light, professional; simplified partner page highlighting Ocaso core. No team section, no investor deck.
*/

export default function InvestorsPage() {
  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              <Sparkles className="h-4 w-4" /> Ocaso Ecosysteem — Partners
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Groei mee met het Ocaso‑ecosysteem
            </h1>
            <p className="mt-3 text-lg text-neutral-700 md:text-xl">
              Ocaso is méér dan een verkoopportaal: we verbinden kopers, particuliere én zakelijke verkopers met veilige betalingen, AI‑gestuurde listing & search en schaalbare logistiek.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                Word partner <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core of Ocaso */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
          {[
            { icon: Shield, title: "Escrow als standaard", desc: "Betalingen worden pas vrijgegeven na leveringsbevestiging. Minder risico, meer vertrouwen." },
            { icon: Zap, title: "AI‑flows", desc: "1‑min listing, automatische beschrijving & prijsvoorstel, betere matching en zoekresultaten." },
            { icon: Globe2, title: "Schaalbare logistiek", desc: "Labels, tracking en verzekerd verzenden via integraties met EU‑logistieke partners." },
            { icon: Store, title: "Voor particulieren én B2B", desc: "Van zolderverkoop tot professionele storefronts en API‑koppelingen." },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <f.icon className="h-6 w-6 text-emerald-600" />
              <div className="mt-3 font-medium text-lg">{f.title}</div>
              <div className="mt-1 text-sm text-neutral-700">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Integraties & samenwerking */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Integraties & samenwerking</h2>
            <Target className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { title: "Payments", points: ["Escrow‑betalingen", "Meerdere betaalmethodes", "Uitbetalingsschema's"] },
              { title: "Logistics", points: ["Label & tracking", "Afhaalpunten", "Verzekering & claims"] },
              { title: "Partner API", points: ["REST/JSON", "Webhooks", "Sandbox & keys"] },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="font-medium">{c.title}</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1">
                  {c.points.map((p, j) => (<li key={j}>{p}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap high level */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Roadmap (high‑level)</h2>
            <Rocket className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { phase: "Q3 2025", items: ["Core marketplace v1", "AI‑upload v1", "Eerste logistieke partners"] },
              { phase: "Q4 2025", items: ["Escrow & disputes", "Zakelijke storefronts", "Analytics & reviews"] },
              { phase: "2026", items: ["EU‑expansie", "Creator programma", "Open partner API"] },
            ].map((col, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="text-sm text-emerald-700">{col.phase}</div>
                <ul className="mt-2 space-y-2 text-sm text-neutral-700">
                  {col.items.map((it, j) => (
                    <li key={j} className="flex gap-2"><BadgeCheck className="h-4 w-4 text-emerald-600" /> {it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold">Samenwerken met Ocaso?</h3>
              <p className="mt-2 text-neutral-700">We zoeken strategische partners in logistiek, payments en zakelijke verkoopkanalen. Laat iets van je horen — we plannen graag een kennismaking.</p>
            </div>
            <div className="md:text-right">
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                Contacteer ons <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

