"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";

/*
  Over Ocaso - Wat is Ocaso?
  Een marketplace waar mensen eenvoudig spullen kunnen kopen en verkopen,
  met veilige betalingen, chat tussen kopers en verkopers, en logistieke ondersteuning.
*/

export default function AboutPage() {
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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <Sparkles className="h-4 w-4" /> Over Ocaso
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              De eenvoudigste manier om spullen te kopen en verkopen
            </h1>
            <p className="mt-3 text-lg text-neutral-700 md:text-xl">
              Ocaso is een Belgische marketplace waar particulieren en bedrijven veilig en eenvoudig spullen kunnen aanbieden, kopen en verkopen. Met slimme tools, directe communicatie en betrouwbare verzending.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/explore" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                Start met verkennen <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sell" className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium hover:bg-neutral-50">
                Begin met verkopen
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Wat maakt Ocaso uniek */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
          {[
            { icon: Shield, title: "Veilige betalingen", desc: "Betalingen worden beschermd tot de koop succesvol is afgerond. Minder risico voor iedereen." },
            { icon: MessageCircle, title: "Directe communicatie", desc: "Chat rechtstreeks met verkopers om vragen te stellen en afspraken te maken." },
            { icon: Truck, title: "Verzending & afhalen", desc: "Kies tussen verzending met tracking of afhalen bij de verkoper in de buurt." },
            { icon: Users, title: "Voor iedereen", desc: "Van particulieren die opruimen tot bedrijven die professioneel verkopen." },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <f.icon className="h-6 w-6 text-emerald-600" />
              <div className="mt-3 font-medium text-lg">{f.title}</div>
              <div className="mt-1 text-sm text-neutral-700">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Hoe het werkt */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold">Hoe Ocaso werkt</h2>
            <p className="mt-2 text-neutral-600">In 3 eenvoudige stappen</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Plaats je advertentie", desc: "Maak een gratis account, neem foto's en schrijf een korte beschrijving. AI helpt je met suggesties." },
              { step: "2", title: "Ontvang biedingen", desc: "Kopers nemen contact op via chat. Bespreek prijs, verzending en haalafspraken." },
              { step: "3", title: "Verkoop succesvol", desc: "Lever het product, bevestig ontvangst en het geld wordt automatisch uitbetaald." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700 mb-4">
                  {s.step}
                </div>
                <h3 className="font-medium text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voor kopers en verkopers */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Waarom kiezen voor Ocaso?</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <div className="font-medium">Voor kopers</div>
              </div>
              <ul className="text-sm text-neutral-700 space-y-2">
                <li>• Zoek eenvoudig naar producten in je buurt</li>
                <li>• Chat direct met verkopers voor vragen</li>
                <li>• Veilige betalingen via escrow</li>
                <li>• Keuze uit verzending of afhalen</li>
              </ul>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Store className="h-5 w-5 text-emerald-600" />
                <div className="font-medium">Voor verkopers</div>
              </div>
              <ul className="text-sm text-neutral-700 space-y-2">
                <li>• Plaats gratis advertenties</li>
                <li>• AI helpt bij beschrijvingen en prijzen</li>
                <li>• Beheer je verkopen eenvoudig</li>
                <li>• Snelle uitbetalingen</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap / Tijdlijn */}
      <section className="px-6 pb-8 md:pb-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold">Wat staat er op de planning?</h2>
            <p className="mt-2 text-neutral-600">Onze roadmap voor de komende maanden</p>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-emerald-200 md:left-1/2 md:transform md:-translate-x-0.5"></div>
            
            <div className="space-y-8">
              {[
                {
                  quarter: "Q4 2025",
                  title: "Geavanceerde verzendopties",
                  description: "Automatische verzendlabels, bulk verzending en integratie met meer vervoerders voor snellere levering.",
                  status: "planned"
                },
                {
                  quarter: "Q1 2026", 
                  title: "AI-gedreven marktanalyse",
                  description: "Slimme prijsvoorstellen, verkoopvoorspellingen en inzichten in markttrends om verkopers te helpen.",
                  status: "planned"
                },
                {
                  quarter: "Q2 2026",
                  title: "Mobiele app",
                  description: "Native iOS en Android apps voor nog eenvoudigere toegang tot Ocaso onderweg.",
                  status: "planned"
                },
                {
                  quarter: "Q3 2026",
                  title: "Internationale uitbreiding",
                  description: "Uitbreiding naar Nederland en Luxemburg met lokale verzendopties en taalondersteuning.",
                  status: "planned"
                },
                {
                  quarter: "Q4 2026",
                  title: "Geautomatiseerde klantenservice",
                  description: "AI-chatbot voor snelle hulp bij veelgestelde vragen en automatische geschillenafhandeling.",
                  status: "planned"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-6 w-4 h-4 bg-emerald-600 rounded-full border-4 border-white z-10 md:left-1/2 md:transform md:-translate-x-1/2"></div>
                  
                  {/* Content */}
                  <div className={`ml-16 md:ml-0 md:w-1/2 ${
                    index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8'
                  }`}>
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
                      <div className="text-sm font-medium text-emerald-700 bg-emerald-100 inline-block px-2 py-1 rounded-full mb-2">
                        {item.quarter}
                      </div>
                      <h3 className="font-medium text-lg mb-1">{item.title}</h3>
                      <p className="text-sm text-neutral-600">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-500">
              Deze planning kan veranderen gebaseerd op feedback van onze gebruikers. 
              <Link href="/contact" className="text-emerald-600 hover:text-emerald-700 ml-1">
                Laat ons weten wat jij belangrijk vindt!
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold">Klaar om te beginnen?</h3>
              <p className="mt-2 text-neutral-700">Sluit je aan bij duizenden Belgen die al succesvol kopen en verkopen op Ocaso.</p>
            </div>
            <div className="md:text-right">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                Maak account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

