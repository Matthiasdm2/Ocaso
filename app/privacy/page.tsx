"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Database, FileText, Globe2, Lock, Mail, Shield } from "lucide-react";
import Link from "next/link";

/*
  Save as: app/privacy/page.tsx
  Style: Light, professional (white cards, subtle borders, emerald accents)
  Note: Replace [datum invullen] with your actual last-updated date.
*/

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <FileText className="h-4 w-4" /> Privacy & Disclaimer
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Privacybeleid & Disclaimer</h1>
            <p className="mt-3 max-w-3xl text-lg text-neutral-700 md:text-xl">
              We beschermen jouw gegevens en zorgen voor transparante, veilige verwerking binnen het Ocaso‑ecosysteem.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
              <Clock className="h-4 w-4" /> Laatste update: <span className="ml-1 font-medium">[datum invullen]</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick links */}
      <section className="px-6 pb-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="#collect" icon={Database} title="Gegevens die we verzamelen" desc="Account, transacties, techniek" />
          <QuickLink href="#use" icon={CheckCircle2} title="Gebruik van gegevens" desc="Transacties, support, veiligheid" />
          <QuickLink href="#share" icon={Shield} title="Delen met derden" desc="Betaal- & logistieke partners" />
          <QuickLink href="#retention" icon={Clock} title="Bewaartermijnen" desc="Wettelijke & operationele termijnen" />
          <QuickLink href="#rights" icon={FileText} title="Jouw rechten (GDPR)" desc="Inzage, wissen, bezwaar, dataportabiliteit" />
          <QuickLink href="#security" icon={Lock} title="Beveiliging" desc="Encryptie, toegangscontrole, audits" />
        </div>
      </section>

      {/* Content sections */}
      <section className="px-6 pb-12 md:pb-16">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card id="collect" title="1) Verzamelen van gegevens" icon={Database}>
            <p className="text-neutral-700">We verzamelen alleen wat nodig is voor accountbeheer, transacties, verzending, support, platformbeveiliging en wettelijke verplichtingen.</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li><span className="font-medium">Persoonsgegevens</span>: naam, e‑mail, telefoon, adres.</li>
              <li><span className="font-medium">Transactiegegevens</span>: bestellingen, betalingen (escrow), verzendinfo.</li>
              <li><span className="font-medium">Technische gegevens</span>: IP, apparaat/browser, cookies, gebruiksstatistieken.</li>
            </ul>
          </Card>

          <Card id="use" title="2) Gebruik van gegevens" icon={CheckCircle2}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Transacties faciliteren: betalingen, escrow, verzending, communicatie.</li>
              <li>Beveiliging en fraudepreventie, monitoring en foutopsporing.</li>
              <li>Support: vragen afhandelen, disputen en retourstromen.</li>
              <li>Verbetering van platform en gebruikerservaring (geaggregeerde analytics).</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700">We verkopen of verhuren <span className="font-medium">nooit</span> persoonsgegevens aan derden.</p>
          </Card>

          <Card id="share" title="3) Delen met derden" icon={Shield}>
            <p className="text-neutral-700">We delen gegevens uitsluitend als dat noodzakelijk is voor onze dienstverlening:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Betaalproviders (bijv. voor Bancontact, iDEAL, creditcard, SEPA).</li>
              <li>Logistieke partners (labels, tracking, bezorging, claims).</li>
              <li>Juridische en fiscale verplichtingen (bijv. facturatie, wetshandhaving).</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700">Met al onze partners sluiten we verwerkersovereenkomsten en passende waarborgen.</p>
          </Card>

          <Card id="retention" title="4) Bewaartermijnen" icon={Clock}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Transactie‑ en facturatiegegevens: <span className="font-medium">7 jaar</span> (wettelijk vereist).</li>
              <li>Accountgegevens: zolang je account actief is.</li>
              <li>Na verwijdering: binnen <span className="font-medium">30 dagen</span> verwijderen of anonimiseren, voor zover wettelijk toegestaan.</li>
            </ul>
          </Card>

          <Card id="rights" title="5) Jouw rechten (GDPR/AVG)" icon={FileText}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Inzage, correctie en verwijdering van je gegevens.</li>
              <li>Beperking of bezwaar tegen verwerking.</li>
              <li>Dataportabiliteit.</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-700">Dien je verzoek in via <a href="mailto:privacy@ocaso.app" className="text-emerald-700 hover:underline">privacy@ocaso.app</a>. We reageren binnen de wettelijke termijnen.</p>
          </Card>

          <Card id="security" title="6) Beveiliging" icon={Lock}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Versleutelde verbindingen (SSL/TLS).</li>
              <li>Escrow‑betalingen en toegangsbeheer.</li>
              <li>Beveiligingsmonitors en periodieke updates.</li>
              <li>Minimale en doelgebonden gegevensverwerking.</li>
            </ul>
          </Card>

          <Card id="intl" title="7) Internationale verwerking" icon={Globe2}>
            <p className="text-sm text-neutral-700">Als gegevens buiten de EU worden verwerkt, doen we dat conform <span className="font-medium">GDPR/AVG</span> en met passende waarborgen (bijv. EU‑U.S. Data Privacy Framework of standaardcontractbepalingen).</p>
          </Card>

          <Card id="disclaimer" title="8) Disclaimer" icon={AlertCircle}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>We streven naar maximale zorg en beveiliging, maar zijn niet aansprakelijk voor misbruik van accounts door derden.</li>
              <li>We zijn niet verantwoordelijk voor storingen bij externe partners of voor handelingen die gebruikers buiten Ocaso om uitvoeren (bijv. directe betalingen).</li>
            </ul>
          </Card>

          {/* Contact & CTA */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 text-emerald-700"><Mail className="h-5 w-5" /> Contact voor privacyverzoeken</div>
              <p className="mt-2 text-sm text-neutral-700">Vragen of verzoeken? Neem contact met ons op:</p>
              <div className="mt-2 text-sm"><a className="text-emerald-700 hover:underline" href="mailto:privacy@ocaso.app">privacy@ocaso.app</a></div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 text-emerald-700"><Shield className="h-5 w-5" /> Zie ook</div>
              <ul className="mt-2 list-disc pl-6 text-sm text-neutral-700">
                <li><Link href="/safety" className="text-emerald-700 hover:underline">Veilig handelen</Link> — tips, escrow en verificatie</li>
                <li><Link href="/policies/fees" className="text-emerald-700 hover:underline">Tarievenoverzicht</Link> — transparante kosten</li>
                <li><Link href="/help" className="text-emerald-700 hover:underline">Help & Q&A</Link> — direct antwoorden vinden</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-semibold">Transparant en veilig omgaan met data</h3>
                <p className="mt-2 text-neutral-700">Privacy is een kernwaarde binnen het Ocaso‑ecosysteem. We verwerken uitsluitend wat nodig is en houden je transparant op de hoogte.</p>
              </div>
              <div className="md:text-right">
                <Link href="/help" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                  Naar Help & Q&A <ArrowRight className="h-4 w-4" />
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
function QuickLink({ href, icon: Icon, title, desc }: { href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; desc: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-emerald-200">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-neutral-600">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function Card({ id, title, icon: Icon, children }: { id?: string; title: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-700" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}
