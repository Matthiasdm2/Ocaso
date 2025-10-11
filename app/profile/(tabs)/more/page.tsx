"use client";

import Link from "next/link";

export default function MorePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meer informatie</h1>
        <p className="text-gray-600">
          Hier vind je links naar nuttige informatie over OCASO.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">Navigatie</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/explore" className="text-primary hover:underline">
                Ontdekken
              </Link>
            </li>
            <li>
              <Link href="/categories" className="text-primary hover:underline">
                Marktplaats
              </Link>
            </li>
            <li>
              <Link href="/sell" className="text-primary hover:underline">
                Plaats zoekertje
              </Link>
            </li>
            <li>
              <Link href="/business" className="text-primary hover:underline">
                Zakelijke oplossingen
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">Support</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/help" className="text-primary hover:underline">
                Help & FAQ
              </Link>
            </li>
            <li>
              <Link href="/safety" className="text-primary hover:underline">
                Veilig handelen
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-primary hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-primary hover:underline">
                Voorwaarden
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border bg-white p-6 md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Nieuwsbrief</h2>
          <p className="text-sm text-gray-600 mb-3">
            Ontvang tips, deals en updates over OCASO.
          </p>
          <form className="flex flex-col sm:flex-row gap-2 max-w-md">
            <input
              placeholder="jouw@email.com"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <button className="rounded-xl bg-primary text-black px-4 py-2 font-medium whitespace-nowrap text-sm">
              Inschrijven
            </button>
          </form>
        </div>
      </div>

      <div className="text-sm text-gray-500 border-t pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} OCASO. Alle rechten voorbehouden.
          </span>
          <div className="flex gap-3">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/cookies" className="hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
