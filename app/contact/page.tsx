"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, HelpCircle, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";

/*
  Save as: app/contact/page.tsx
  Style: Light, professional, same design language as privacy/cookies/safety pages.
*/

export default function ContactPage() {
  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              <MessageSquare className="h-4 w-4" /> Contact
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Neem contact op met Ocaso</h1>
            <p className="mt-3 max-w-3xl text-lg text-neutral-700 md:text-xl">
              Heb je vragen, opmerkingen of hulp nodig? We helpen je graag verder. Kies het kanaal dat het beste bij je past.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact options */}
      <section className="px-6 pb-12 md:pb-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <ContactCard
            icon={Mail}
            title="E-mail"
            desc="Stuur ons een mailtje en we antwoorden zo snel mogelijk."
            content={<a href="mailto:support@ocaso.app" className="text-emerald-700 hover:underline">support@ocaso.app</a>}
          />
          <ContactCard
            icon={Phone}
            title="Telefoon"
            desc="Bereikbaar op werkdagen tijdens kantooruren."
            content={<a href="tel:+3200000000" className="text-emerald-700 hover:underline">+32 000 00 00</a>}
          />
          <ContactCard
            icon={HelpCircle}
            title="Supportaanvraag"
            desc="Start een ticket en volg eenvoudig de status van je vraag."
            content={<Link href="/support/new" className="text-emerald-700 hover:underline">Start supportaanvraag</Link>}
          />
        </div>
      </section>

      {/* Map / address */}
      <section className="px-6 pb-12 md:pb-16">
        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-emerald-700"><MapPin className="h-5 w-5" /> Ons adres</div>
            <p className="mt-2 text-sm text-neutral-700">[Straatnaam 123]<br />[9000 Gent, België]</p>
            <div className="mt-4 text-xs text-neutral-500">Bezoek enkel op afspraak.</div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-2 text-emerald-700"><Clock className="h-5 w-5" /> Openingstijden</div>
            <ul className="mt-2 space-y-1 text-sm text-neutral-700">
              <li>Maandag – Vrijdag: 9:00 – 17:00</li>
              <li>Zaterdag & Zondag: gesloten</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-semibold">Stel je vraag direct</h3>
                <p className="mt-2 text-neutral-700">Ons team reageert snel en duidelijk. We streven ernaar om binnen 24 uur te antwoorden.</p>
              </div>
              <div className="md:text-right">
                <Link href="/support/new" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                  Start supportaanvraag <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Components ---------------- */
function ContactCard({ icon: Icon, title, desc, content }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; desc: string; content: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-700" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-neutral-700">{desc}</p>
      <div className="mt-3 text-sm">{content}</div>
    </div>
  );
}
