"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Globe2,
  HelpCircle,
  Lock,
  Mail,
  MessageSquare,
  PackageCheck,
  Phone,
  RefreshCcw,
  Search,
  Shield,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/*
  Save as: app/help/page.tsx
  Style: Light, professional (white cards, subtle borders, emerald accents)
  No external assets required. Icons via lucide-react, micro-animations via framer-motion.
*/

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const categories: HelpCategory[] = useMemo(
    () => [
      {
        id: "buyers",
        title: "Kopers",
        icon: HelpCircle,
        faqs: [
          {
            q: "Hoe werkt betalen met escrow?",
            a: "Bij escrow wordt je betaling veilig vastgezet tot je de levering bevestigt. Pas daarna ontvangt de verkoper het geld. Bij een probleem start je eenvoudig een dispute vanuit je bestelling.",
            icon: CreditCard,
          },
          {
            q: "Wanneer ontvang ik mijn tracking?",
            a: "Zodra de verkoper het verzendlabel heeft aangemaakt, verschijnt de tracking automatisch in je bestelling en in je mailbox.",
            icon: Truck,
          },
          {
            q: "Kan ik een bestelling annuleren?",
            a: "Zolang de zending niet is overgedragen aan de transporteur kun je de bestelling annuleren vanuit je orderdetail. Na overdracht vraag je een retour of dispute aan.",
            icon: RefreshCcw,
          },
        ],
      },
      {
        id: "sellers",
        title: "Verkopers (particulier & zakelijk)",
        icon: Store,
        faqs: [
          {
            q: "Hoe plaats ik sneller een zoekertje?",
            a: "Upload een foto; onze AI genereert automatisch titel, beschrijving en een prijsvoorstel. Je kunt dit altijd nog aanpassen.",
            icon: CheckCircle2,
          },
          {
            q: "Wanneer wordt mijn geld uitbetaald?",
            a: "Na leveringsbevestiging door de koper (of automatisch na de levertermijn) maken we het bedrag over volgens je uitbetalingsvoorkeur.",
            icon: CreditCard,
          },
          {
            q: "Hoe werkt zakelijke verificatie?",
            a: "Upload je bedrijfsgegevens (btw‑nummer, adres, UBO). Na controle krijg je een zakelijke storefront met extra tools en analytics.",
            icon: Store,
          },
        ],
      },
      {
        id: "payments",
        title: "Betalingen & Escrow",
        icon: CreditCard,
        faqs: [
          {
            q: "Welke betaalmethoden worden ondersteund?",
            a: "We ondersteunen o.a. Bancontact, iDEAL, creditcard en SEPA. Beschikbaarheid kan per land verschillen.",
            icon: CreditCard,
          },
          {
            q: "Wat als de betaling is mislukt?",
            a: "Controleer je betaalmethode en saldo. Herstart de betaling vanuit je bestelling. Blijft het misgaan, contacteer ons supportteam met de foutcode.",
            icon: AlertCircle,
          },
          {
            q: "Wanneer wordt escrow vrijgegeven?",
            a: "Na bevestigde levering of automatisch na afloop van de levertermijn als er geen dispute is geopend.",
            icon: Shield,
          },
        ],
      },
      {
        id: "shipping",
        title: "Verzending & Retouren",
        icon: Truck,
        faqs: [
          {
            q: "Hoe maak ik een verzendlabel aan?",
            a: "In je order kies je ‘Label aanmaken’. De adresgegevens worden vooraf ingevuld. Print het label en geef je pakket af bij het gekozen punt.",
            icon: PackageCheck,
          },
          {
            q: "Wat als mijn pakket vertraagd is?",
            a: "Check de tracking. Blijft je zending stilstaan, neem contact op met support en voeg je order‑ID en trackinglink toe.",
            icon: Truck,
          },
          {
            q: "Hoe werkt retourneren?",
            a: "Binnen de retourtermijn start je een retour via je bestelling. Je ontvangt instructies en indien nodig een retourlabel.",
            icon: RefreshCcw,
          },
        ],
      },
      {
        id: "account",
        title: "Account & Veiligheid",
        icon: Lock,
        faqs: [
          {
            q: "Ik kan niet inloggen — wat nu?",
            a: "Reset je wachtwoord via ‘Wachtwoord vergeten’. Controleer ook of je e‑mail is geverifieerd. Werkt het niet, neem dan contact op met support.",
            icon: Lock,
          },
          {
            q: "Hoe beschermt Ocaso mijn gegevens?",
            a: "We gebruiken versleutelde verbindingen, beperkte data‑toegang en monitoring. Lees ook ons privacybeleid voor details.",
            icon: Shield,
          },
          {
            q: "Hoe wijzig ik mijn e‑mail of telefoonnummer?",
            a: "Ga naar Profiel → Instellingen → Account. Bevestig de wijziging via de verificatiecode in je mailbox of sms.",
            icon: CheckCircle2,
          },
        ],
      },
      {
        id: "business",
        title: "Zakelijke verkopers & API",
        icon: Globe2,
        faqs: [
          {
            q: "Hoe krijg ik toegang tot de Ocaso API?",
            a: "Na zakelijke verificatie kun je API‑toegang aanvragen via het partnerportaal. Je krijgt sandbox‑keys en documentatie.",
            icon: Globe2,
          },
          {
            q: "Ondersteunen jullie bulk‑uploads?",
            a: "Ja, via CSV/Excel en via API. Ga naar ‘Bulk upload’ in je storefront om een template te downloaden.",
            icon: Store,
          },
          {
            q: "Welke fees gelden voor zakelijke accounts?",
            a: "Transparant model: platformfee per transactie en optionele abonnementen voor extra features. Zie het tarievenoverzicht in je account.",
            icon: CreditCard,
          },
        ],
      },
    ],
    []
  );

  const allFaqs = useMemo(() => categories.flatMap((c) => c.faqs.map((f) => ({ ...f, category: c.title }))), [categories]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [] as Filtered[];
    const q = query.toLowerCase();
    return allFaqs
      .filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || (f.category ?? "").toLowerCase().includes(q))
      .slice(0, 12) // limit to keep it compact
      .map((f) => ({ ...f, category: f.category ?? "Algemeen" }));
  }, [query, allFaqs]);

  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              <HelpCircle className="h-4 w-4" />
              Help & Q&A
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Hoe kunnen we je helpen?</h1>
            <p className="mt-3 text-lg text-neutral-700 md:text-xl">Vind snel antwoorden of neem contact op met ons supportteam. Veilig, transparant en snel.</p>

            {/* Search */}
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2">
              <Search className="ml-2 h-5 w-5 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek op onderwerp, bv. ‘escrow’, ‘verzending’, ‘betalingen’..."
                className="w-full rounded-xl bg-transparent px-2 py-3 text-sm outline-none placeholder:text-neutral-400"
              />
              <Link href="#popular" className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-200">
                Populair
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Instant results */}
            {query && (
              <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
                {filtered.length ? (
                  <ul className="divide-y divide-neutral-100">
                    {filtered.map((f, i) => (
                      <li key={i} className="py-3">
                        <div className="text-sm text-emerald-700">{f.category}</div>
                        <div className="mt-0.5 font-medium">{highlight(f.q, query)}</div>
                        <div className="mt-1 text-sm text-neutral-600">{highlight(f.a, query)}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <AlertCircle className="h-4 w-4" /> Geen resultaten. Probeer een ander zoekwoord.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Popular topics */}
      <section id="popular" className="px-6 py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold md:text-3xl">Populaire onderwerpen</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PopularCard icon={CreditCard} title="Betalen met escrow" desc="Veilig betalen, vrijgave na levering" href="#payments" />
            <PopularCard icon={Truck} title="Verzending & tracking" desc="Labels, pakketpunten en status" href="#shipping" />
            <PopularCard icon={Store} title="Zakelijke storefronts" desc="Verificatie, analytics en bulk uploads" href="#business" />
          </div>
        </div>
      </section>

      {/* Categories with accordions */}
      <section className="px-6 pb-12 md:pb-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {categories.map((cat) => (
              <CategoryBlock key={cat.id} id={cat.id} title={cat.title} icon={cat.icon} faqs={cat.faqs} />
            ))}
          </div>

          {/* Contact / Shortcuts */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-2 text-emerald-700"><MessageSquare className="h-5 w-5" /> Contact opnemen</div>
              <p className="mt-2 text-sm text-neutral-700">Kom je er niet uit? Ons team helpt je graag verder.</p>
              <div className="mt-4 space-y-2 text-sm">
                <a href="mailto:support@ocaso.app" className="flex items-center gap-2 text-neutral-800 hover:underline"><Mail className="h-4 w-4" /> support@ocaso.app</a>
                <a href="tel:+3200000000" className="flex items-center gap-2 text-neutral-800 hover:underline"><Phone className="h-4 w-4" /> +32 000 00 00</a>
                <Link href="/support/new" className="flex items-center gap-2 text-neutral-800 hover:underline"><MessageSquare className="h-4 w-4" /> Start supportaanvraag</Link>
              </div>
              <Link href="/status" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 hover:bg-neutral-50">
                Systeemstatus
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </Link>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="text-sm font-medium">Gidsen & beleid</div>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                <li><Link className="hover:underline" href="/policies/payments">Betaal- & escrowbeleid</Link></li>
                <li><Link className="hover:underline" href="/policies/shipping">Verzendgids</Link></li>
                <li><Link className="hover:underline" href="/policies/disputes">Dispute & retourbeleid</Link></li>
                <li><Link className="hover:underline" href="/policies/privacy">Privacy & gegevensbescherming</Link></li>
                <li><Link className="hover:underline" href="/policies/fees">Tarievenoverzicht</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-semibold">Nog hulp nodig?</h3>
                <p className="mt-2 text-neutral-700">Dien een aanvraag in en we reageren snel met een duidelijk plan van aanpak.</p>
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

/* ---------------- Types ---------------- */
type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type FAQ = {
  q: string;
  a: string;
  icon?: IconType;
};

type HelpCategory = {
  id: string;
  title: string;
  icon?: IconType;
  faqs: FAQ[];
};

type Filtered = FAQ & { category: string };

/* ---------------- Components ---------------- */
function PopularCard({ icon: Icon, title, desc, href }: { icon: IconType; title: string; desc: string; href: string }) {
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

function CategoryBlock({ id, title, icon: Icon, faqs }: { id: string; title: string; icon?: IconType; faqs: FAQ[] }) {
  return (
    <section id={id} className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5 text-emerald-700" /> : null}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-4 divide-y divide-neutral-100">
        {faqs.map((f, i) => (
          <FAQItem key={i} faq={f} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  const Icon = faq.icon ?? HelpCircle;
  return (
    <div className="py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 rounded-lg bg-neutral-100 p-2 text-emerald-700"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 truncate font-medium">{faq.q}</span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-neutral-700">{faq.a}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
            Was dit nuttig?
            <button className="rounded-md border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50">Ja</button>
            <button className="rounded-md border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50">Nee</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Utils ---------------- */
function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="rounded-sm bg-emerald-100 px-1 py-0.5 text-emerald-800">{match}</mark>
      {after}
    </>
  );
}
