"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, FileText, Scale, Shield, Users } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <Scale className="h-4 w-4" /> Algemene Voorwaarden
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Algemene Voorwaarden Ocaso</h1>
            <p className="mt-3 max-w-3xl text-lg text-neutral-700 md:text-xl">
              Duidelijke regels voor veilig en eerlijk gebruik van ons platform. Lees deze voorwaarden zorgvuldig door.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
              <AlertCircle className="h-4 w-4" /> Laatste update: <span className="ml-1 font-medium">28 september 2025</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick links */}
      <section className="px-6 pb-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="#general" icon={Users} title="Algemeen" desc="Definities en basisregels" />
          <QuickLink href="#selling" icon={Shield} title="Verkopen" desc="Regels voor aanbieders" />
          <QuickLink href="#buying" icon={CheckCircle2} title="Kopen" desc="Rechten van kopers" />
          <QuickLink href="#shipping" icon={CheckCircle2} title="Verzending" desc="Levering & verzenddienst" />
          <QuickLink href="#liability" icon={Scale} title="Aansprakelijkheid" desc="Verantwoordelijkheden" />
          <QuickLink href="#disputes" icon={AlertCircle} title="Geschillen" desc="Oplossing van conflicten" />
          <QuickLink href="#contact" icon={FileText} title="Contact" desc="Hulp en ondersteuning" />
        </div>
      </section>

      {/* Content sections */}
      <section className="px-6 pb-12 md:pb-16">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card id="general" title="1. Algemeen" icon={Users}>
            <p className="text-neutral-700 mb-4">
              Welkom bij Ocaso, een online marktplaats waar particulieren en bedrijven spullen kunnen kopen en verkopen.
              Deze algemene voorwaarden zijn van toepassing op het gebruik van de website en diensten van Ocaso.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Definities</h4>
            <ul className="space-y-1 text-neutral-700">
              <li><strong>&quot;Ocaso&quot;</strong>: De online marktplaats en bijbehorende diensten</li>
              <li><strong>&quot;Gebruiker&quot;</strong>: Iedereen die de website bezoekt of gebruikt</li>
              <li><strong>&quot;Verkoper&quot;</strong>: Gebruiker die producten aanbiedt te koop</li>
              <li><strong>&quot;Koper&quot;</strong>: Gebruiker die producten koopt</li>
              <li><strong>&quot;Listing&quot;</strong>: Een advertentie voor een product te koop</li>
              <li><strong>&quot;Business Account&quot;</strong>: Premium account voor professionele verkopers</li>
            </ul>
          </Card>

          <Card id="selling" title="2. Verkopen op Ocaso" icon={Shield}>
            <h4 className="font-semibold text-neutral-900 mb-2">Listings plaatsen</h4>
            <p className="text-neutral-700 mb-4">
              Verkopen mogen alleen producten aanbieden die legaal zijn, die u eigendom zijn, en waarvoor u verkooprecht heeft.
              Producten moeten nauwkeurig worden beschreven met eerlijke foto&apos;s.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Verboden producten</h4>
            <p className="text-neutral-700 mb-2">Het is verboden om de volgende producten te verkopen:</p>
            <ul className="space-y-1 text-neutral-700 mb-4">
              <li>• Illegale producten of diensten</li>
              <li>• Gevallen dieren of beschermde diersoorten</li>
              <li>• Vuurwapens, munitie of explosieven</li>
              <li>• Drugs en precursoren</li>
              <li>• Gestolen goederen</li>
              <li>• Producten met auteursrechtinbreuk</li>
            </ul>

            <h4 className="font-semibold text-neutral-900 mb-2">Business Accounts</h4>
            <p className="text-neutral-700">
              Professionele verkopers kunnen een Business Account aanmaken voor extra functies zoals verhoogde zichtbaarheid,
              analytics en prioriteit ondersteuning.
            </p>
          </Card>

          <Card id="buying" title="3. Kopen op Ocaso" icon={CheckCircle2}>
            <h4 className="font-semibold text-neutral-900 mb-2">Betalingen</h4>
            <p className="text-neutral-700 mb-4">
              Betalingen verlopen rechtstreeks tussen koper en verkoper. Ocaso faciliteert geen betalingen
              maar adviseert veilige betalingsmethoden te gebruiken.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Reviews en beoordelingen</h4>
            <p className="text-neutral-700">
              Na voltooiing van een transactie kunnen beide partijen elkaar beoordelen.
              Beoordelingen moeten eerlijk en respectvol zijn.
            </p>
          </Card>

          <Card id="shipping" title="4. Verzending & Levering" icon={CheckCircle2}>
            <h4 className="font-semibold text-neutral-900 mb-2">Verzending via Ocaso</h4>
            <p className="text-neutral-700 mb-4">
              Ocaso biedt professionele verzenddiensten aan om transacties veiliger en betrouwbaarder te maken.
              Verkopen kunnen kiezen voor verzending via Ocaso voor extra bescherming en service.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Voordelen van Ocaso verzending</h4>
            <ul className="space-y-1 text-neutral-700 mb-4">
              <li>• Gegarandeerde levering met tracking</li>
              <li>• Verzekering tegen verlies of schade</li>
              <li>• Professionele verpakking</li>
              <li>• Klantenservice ondersteuning</li>
              <li>• Betaling pas na succesvolle levering</li>
            </ul>

            <h4 className="font-semibold text-neutral-900 mb-2">Verzendkosten</h4>
            <p className="text-neutral-700 mb-4">
              Verzendkosten worden berekend op basis van gewicht, afmetingen en bestemming.
              Prijzen zijn transparant en worden vooraf getoond.
            </p>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4">
              <h5 className="font-semibold text-amber-900 mb-2">⚠️ Belangrijk: Misbruik van verzending</h5>
              <p className="text-amber-800 text-sm">
                Misbruik van de verzenddienst (zoals het verzenden van verboden producten, verkeerde beschrijvingen
                of frauduleuze activiteiten) kan aanleiding geven tot boetes vanaf €500 bij vaststelling.
                Ocaso behoudt zich het recht voor om schadevergoeding te eisen voor geleden schade.
              </p>
            </div>
          </Card>

          <Card id="liability" title="6. Aansprakelijkheid & Verantwoordelijkheden" icon={Scale}>
            <p className="text-neutral-700 mb-4">
              Ocaso is een platform dat kopers en verkopers met elkaar verbindt. Wij zijn niet verantwoordelijk voor:
            </p>
            <ul className="space-y-1 text-neutral-700 mb-4">
              <li>• Kwaliteit van aangeboden producten</li>
              <li>• Gedrag van gebruikers</li>
              <li>• Transacties tussen gebruikers</li>
              <li>• Schade door gebruik van het platform</li>
            </ul>

            <h4 className="font-semibold text-neutral-900 mb-2">Gedragscode</h4>
            <p className="text-neutral-700 mb-2">U verplicht zich tot:</p>
            <ul className="space-y-1 text-neutral-700">
              <li>• Respectvol gedrag naar andere gebruikers</li>
              <li>• Eerlijke communicatie</li>
              <li>• Naleving van afspraken</li>
              <li>• Geen misbruik van het platform</li>
            </ul>
          </Card>

          <Card id="disputes" title="7. Geschillen & Accountbeheer" icon={AlertCircle}>
            <h4 className="font-semibold text-neutral-900 mb-2">Geschillen</h4>
            <p className="text-neutral-700 mb-4">
              Bij geschillen tussen gebruikers raden wij aan eerst zelf tot een oplossing te komen.
              Ocaso kan bemiddelen maar is niet verplicht hiertoe.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Account opschorting</h4>
            <p className="text-neutral-700 mb-2">Ocaso behoudt zich het recht voor om accounts op te schorten bij:</p>
            <ul className="space-y-1 text-neutral-700">
              <li>• Overtreding van deze voorwaarden</li>
              <li>• Verdacht gedrag</li>
              <li>• Klachten van andere gebruikers</li>
            </ul>
          </Card>

          <Card id="contact" title="8. Contact & Updates" icon={FileText}>
            <h4 className="font-semibold text-neutral-900 mb-2">Wijzigingen</h4>
            <p className="text-neutral-700 mb-4">
              Ocaso kan deze voorwaarden op elk moment wijzigen. Gebruikers worden via de website
              geïnformeerd over belangrijke wijzigingen.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Toepasselijk recht</h4>
            <p className="text-neutral-700 mb-4">
              Op deze voorwaarden is Nederlands recht van toepassing.
              Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.
            </p>

            <h4 className="font-semibold text-neutral-900 mb-2">Contact</h4>
            <p className="text-neutral-700 mb-2">Voor vragen kunt u contact opnemen via:</p>
            <ul className="space-y-1 text-neutral-700">
              <li>• Email: info@ocaso.nl</li>
              <li>• Via het contactformulier op de website</li>
            </ul>
          </Card>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Vragen over deze voorwaarden?</h3>
            <p className="text-neutral-600 mb-4">
              Neem contact met ons op voor clarification of ondersteuning.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Contact opnemen <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, desc }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <Link href={href} className="group block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-neutral-900 group-hover:text-emerald-700">{title}</h3>
          <p className="text-sm text-neutral-600">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function Card({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div id={id} className="scroll-mt-24">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
        </div>
        {children}
      </div>
    </motion.div>
  );
}
