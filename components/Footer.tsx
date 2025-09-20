import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-12">
      <div className="container py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-semibold mb-3">OCASO</div>
          <p className="text-sm text-gray-600">
            Slim tweedehands kopen en verkopen. Met AI‑zoek en prijscontrole.
          </p>
        </div>
        <div>
          <div className="font-semibold mb-3">Navigatie</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/explore" className="hover:underline">
                Ontdekken
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:underline">
                Marktplaats
              </Link>
            </li>
            <li>
              <Link href="/sell" className="hover:underline">
                Plaats zoekertje
              </Link>
            </li>
            <li>
              <Link href="/business" className="hover:underline">
                Zakelijke oplossingen
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Support</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/help" className="hover:underline">
                Help & FAQ
              </Link>
            </li>
            <li>
              <Link href="/safety" className="hover:underline">
                Veilig handelen
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:underline">
                Voorwaarden
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Nieuwsbrief</div>
          <p className="text-sm text-gray-600 mb-3">
            Ontvang tips, deals en updates.
          </p>
          <form className="flex gap-2">
            <input
              placeholder="jouw@email.com"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2"
            />
            <button className="rounded-xl bg-primary text-black px-4 py-2 font-medium">
              Inschrijven
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="container py-4 text-xs text-gray-500 flex items-center justify-between">
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
    </footer>
  );
}
