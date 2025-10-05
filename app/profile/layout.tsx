"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Avatar from "@/components/Avatar";
import { useProfile } from "@/lib/useProfile";
import { useUnreadBids } from "@/lib/useUnreadBids";
import { useUnreadChats } from "@/lib/useUnreadChats";
import { useUnreadReviews } from "@/lib/useUnreadReviews";

const TABS = [
  { href: "/profile/info", label: "Mijn gegevens" },
  { href: "/profile/business", label: "Zakelijke gegevens" }, // altijd zichtbaar
  { href: "/profile/chats", label: "Chats" },
  // Notificaties tab verwijderd — instellingen nu onder 'Mijn gegevens'
  { href: "/profile/listings", label: "Mijn zoekertjes" },
  { href: "/profile/favorites", label: "Mijn favorieten" },
  { href: "/profile/reviews", label: "Mijn reviews" },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, loading } = useProfile();
  const { total: unreadBidsTotal } = useUnreadBids();
  const { total: unreadChatsTotal } = useUnreadChats();
  const { total: unreadReviewsTotal } = useUnreadReviews();

  // Afgeleide, met fallback
  const initialIsBusiness = useMemo(
    () => Boolean(profile?.business?.isBusiness ?? false),
    [profile],
  );

  const [isBusiness, setIsBusiness] = useState<boolean>(initialIsBusiness);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Sync wanneer profiel laadt/verandert
    setIsBusiness(initialIsBusiness);
  }, [initialIsBusiness]);

  async function persistBusinessFlag() {
    // TODO: vervang door je echte persist (Supabase / API-route)
    // Voorbeeld (pas aan naar jouw schema):
    // const { error } = await supabase.from('profiles').update({ is_business: next }).eq('id', profile.id);
    // if (error) throw error;

    // Dummy wachttijd voor UX-gevoel
    await new Promise((r) => setTimeout(r, 250));
  }

  async function onToggleBusiness(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setSaving(true);
    const prev = isBusiness;
    setIsBusiness(next);
    try {
      await persistBusinessFlag();
    } catch (err) {
      // revert bij fout
      setIsBusiness(prev);
      console.error(err);
      alert("Opslaan mislukt. Probeer later opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  const isBusinessRoute = pathname === "/profile/business";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Avatar src={profile?.avatarUrl} name={`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()} email={undefined} size={64} rounded="full" />
          <div>
            <div className="text-xl font-semibold">Mijn profiel</div>
            <div className="text-sm text-neutral-600">
              {loading ? "…" : `${profile?.firstName || ""} ${profile?.lastName || ""}`}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-xl px-4 py-2 text-sm ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <span>{t.label}</span>
                  {t.href === "/profile/listings" && unreadBidsTotal > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 leading-none">
            {unreadBidsTotal > 99 ? '99+' : unreadBidsTotal}
                    </span>
                  )}
                  {t.href === "/profile/chats" && unreadChatsTotal > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 leading-none">
                      {unreadChatsTotal > 99 ? '99+' : unreadChatsTotal}
                    </span>
                  )}
                  {t.href === "/profile/reviews" && unreadReviewsTotal > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 leading-none">
                      {unreadReviewsTotal > 99 ? '99+' : unreadReviewsTotal}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* “Persoonsgegevens” uitbreiden met toggle — tonen op de info-pagina */}
        {pathname === "/profile/info" && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Zakelijk account</div>
                <div className="text-sm text-neutral-600">
                  Schakel in als u als zakelijke gebruiker wilt verkopen en toegang wilt tot “Zakelijke gegevens”.
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="text-sm">{isBusiness ? "Aan" : "Uit"}</span>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isBusiness}
                  onChange={onToggleBusiness}
                  disabled={saving}
                />
                {/* Simple Tailwind toggle */}
                <div
                  className={`h-6 w-11 rounded-full transition-colors ${
                    isBusiness ? "bg-emerald-600" : "bg-neutral-300"
                  } ${saving ? "opacity-70" : ""}`}
                >
                  <div
                    className={`h-6 w-6 translate-x-0 transform rounded-full bg-white shadow transition-transform ${
                      isBusiness ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>
            {saving && (
              <div className="mt-2 text-sm text-neutral-500">Wijziging wordt opgeslagen…</div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          {isBusinessRoute && !isBusiness ? (
            <div className="text-sm text-neutral-700">
              <div className="mb-2 font-medium">Zakelijke gegevens</div>
              <p>
                U bent geen zakelijke gebruiker, gelieve in uw profiel aan te geven dat u een zakelijke gebruiker bent.
              </p>
              <p className="mt-2 text-neutral-600">
                Tip: Ga naar <span className="font-medium">Mijn gegevens</span> en zet{" "}
                <span className="font-medium">Zakelijk account</span> op <span className="font-medium">Aan</span>.
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
