"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Cookie as CookieIcon, FileText, Settings, Shield } from "lucide-react";
import Link from "next/link";

/*
  Save as: app/cookies/page.tsx
  Style: Light, professional (white cards, subtle borders, emerald accents)
  Note: Replace [datum invullen] with your actual last-updated date.
*/

export default function CookiesPage() {
  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <CookieIcon className="h-4 w-4" /> Cookiebeleid
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Cookiebeleid van Ocaso</h1>
            <p className="mt-3 max-w-3xl text-lg text-neutral-700 md:text-xl">
              We gebruiken cookies om Ocaso veilig, snel en gebruiksvriendelijk te maken. Jij bepaalt zelf je voorkeuren.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
              <Clock className="h-4 w-4" /> Laatste update: <span className="ml-1 font-medium">[datum invullen]</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-6 pb-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="#what" icon={FileText} title="Wat zijn cookies?" desc="Korte uitleg en voorbeelden" />
          <QuickLink href="#types" icon={Shield} title="Soorten cookies" desc="Essentieel, functioneel, analytisch, marketing" />
          <QuickLink href="#manage" icon={Settings} title="Voorkeuren beheren" desc="Aanpassen per categorie" />
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-12 md:pb-16">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card id="what" title="1) Wat zijn cookies?" icon={FileText}>
            <p className="text-sm text-neutral-700">
              Cookies zijn kleine tekstbestanden die op je apparaat worden geplaatst wanneer je Ocaso bezoekt. Ze helpen ons om je te herkennen, je sessie te beveiligen en het platform te verbeteren.
            </p>
          </Card>

          <Card id="types" title="2) Welke cookies gebruiken we?" icon={Shield}>
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3">Categorie</th>
                    <th className="px-4 py-3">Doel</th>
                    <th className="px-4 py-3">Voorbeelden</th>
                    <th className="px-4 py-3">Bewaartermijn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-medium">Essentieel</td>
                    <td className="px-4 py-3">Nodig voor basisfunctionaliteit (inloggen, sessies, beveiliging).</td>
                    <td className="px-4 py-3">Sessie-ID, CSRF‑token</td>
                    <td className="px-4 py-3">Sessie / tot 1 jaar*</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Functioneel</td>
                    <td className="px-4 py-3">Onthoudt voorkeuren (taal, weergave, loginstatus).</td>
                    <td className="px-4 py-3">Taalvoorkeur, UI‑instellingen</td>
                    <td className="px-4 py-3">Tot 12 maanden</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Analytisch</td>
                    <td className="px-4 py-3">Inzicht in gebruik om prestaties en veiligheid te verbeteren.</td>
                    <td className="px-4 py-3">Plausible, Google Analytics (geanonimiseerd)</td>
                    <td className="px-4 py-3">6–24 maanden</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Marketing</td>
                    <td className="px-4 py-3">Relevante promoties/retargeting en metingen van campagnes.</td>
                    <td className="px-4 py-3">Meta Pixel, Google Ads</td>
                    <td className="px-4 py-3">Tot 24 maanden</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-neutral-500">*Bepaalde essentiële cookies kunnen een langere technische geldigheid hebben voor beveiligings- of fraudepreventiedoeleinden.</p>
          </Card>

          <Card id="manage" title="3) Cookievoorkeuren beheren" icon={Settings}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Bij je eerste bezoek verschijnt een cookiebanner. Kies: alles accepteren, alleen essentieel, of per categorie.</li>
              <li>Je kunt je keuze later wijzigen via <span className="font-medium">Instellingen → Privacy & Cookies</span> of de knop hieronder.</li>
            </ul>
            <div className="mt-4">
              <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
                Open cookievoorkeuren
              </button>
            </div>
          </Card>

          <Card id="retention" title="4) Bewaartermijnen" icon={Clock}>
            <p className="text-sm text-neutral-700">Sessie-cookies vervallen wanneer je de browser sluit. Permanente cookies blijven tot ze verlopen of door jou worden verwijderd. We hanteren maximale termijnen van 24 maanden, tenzij wettelijk anders vereist.</p>
          </Card>

          <Card id="privacy" title="5) Gegevensbescherming" icon={Shield}>
            <p className="text-sm text-neutral-700">Alle via cookies verzamelde informatie wordt verwerkt conform ons <Link href="/privacy" className="text-emerald-700 hover:underline">Privacybeleid</Link>. We minimaliseren datacollectie en pseudonimiseren waar mogelijk.</p>
          </Card>

          <Card id="rights" title="6) Jouw keuzes & rechten" icon={CheckCircle2}>
            <ul className="list-disc space-y-2 pl-6 text-sm text-neutral-700">
              <li>Je kunt cookies beheren of verwijderen via je browserinstellingen.</li>
              <li>Je kunt je toestemming per categorie aanpassen via onze voorkeurentool.</li>
              <li>Voor privacyverzoeken (inzage, wissen, bezwaar) mail naar <a href="mailto:privacy@ocaso.app" className="text-emerald-700 hover:underline">privacy@ocaso.app</a>.</li>
            </ul>
          </Card>

          <Card id="changes" title="7) Wijzigingen in dit beleid" icon={AlertCircle}>
            <p className="text-sm text-neutral-700">Bij belangrijke wijzigingen updaten we dit document en passen we zo nodig de cookiebanner aan. Raadpleeg deze pagina regelmatig voor de meest actuele versie.</p>
          </Card>

          {/* CTA */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-semibold">Beheer je cookievoorkeuren</h3>
                <p className="mt-2 text-neutral-700">Kies welke categorieën je toestaat. Je kunt dit altijd aanpassen.</p>
              </div>
              <div className="md:text-right">
                <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                  Open voorkeuren <ArrowRight className="h-4 w-4" />
                </button>
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
      <div className="mt-3">{children}</div>
    </section>
  );
}
