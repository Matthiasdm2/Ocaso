"use client";

import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import Avatar from "@/components/Avatar";
import RatingStars from "@/components/RatingStars";
import Tooltip from "@/components/Tooltip";
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';

type Seller = {
  id?: string | number | null;
  name?: string | null;
  avatarUrl?: string | null;
  rating?: number | null;
  salesCount?: number | null;
  isBusiness?: boolean | null;
  isVerified?: boolean | null;
  joinedISO?: string | null;
  responseMins?: number | null;
  lastSeenISO?: string | null;
  cancel_rate_pct?: number | null;
  response_rate_pct?: number | null;
  seller_id?: string | number | null;
  seller_name?: string | null;
  seller_avatar_url?: string | null;
  seller_rating?: number | null;
  seller_sales_count?: number | null;
  seller_is_business?: boolean | null;
  seller_is_verified?: boolean | null;
  seller_vat?: string | null;
  seller_review_count?: number | null;
};

interface Props {
  seller?: Seller;
  location?: string | null;
  coords?: { lat: number; lng: number } | null;
  shippingAvgDays?: number | null;
  responseRatePct?: number | null;
  listingId?: string | null;
}

function formatJoined(iso?: string | null) {
  if (!iso) return "Onbekend";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-BE", { year: "numeric", month: "short" });
  } catch {
    return "Onbekend";
  }
}

// Verwijderd: custom stars renderer vervangen door gedeelde <RatingStars /> component

export default function SellerPanels({
  seller = {},
  location = null,
  coords = null,
  shippingAvgDays = null,
  responseRatePct = null,
  listingId = null,
}: Props) {
  const { profile, loading } = useProfile();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const id = seller.id ?? seller.seller_id ?? null;
  const name = seller.name ?? seller.seller_name ?? "Onbekend";
  // Fallback naar /placeholder.png als /images/avatar-placeholder.png niet bestaat
  let avatar = seller.avatarUrl ?? seller.seller_avatar_url ?? "/images/avatar-placeholder.png";
  if (avatar === "/images/avatar-placeholder.png") {
    avatar = "/placeholder.png";
  }
  const rating = seller.rating ?? seller.seller_rating ?? null;
  const reviewCount = seller.seller_review_count ?? null;
  const sales = seller.salesCount ?? seller.seller_sales_count ?? null;
  const isBusiness = !!(seller.isBusiness ?? seller.seller_is_business) && !!(seller.seller_vat);
  const isVerified = !!(seller.isVerified ?? seller.seller_is_verified);
  const [responseMins, setResponseMins] = useState<number | null | undefined>(seller.responseMins ?? null);
  const [loadingResp, setLoadingResp] = useState(false);
  const [respNote, setRespNote] = useState<string | null>(null);

  // Lazy load gemiddelde responstijd
  useEffect(() => {
    if (!id) return;
    // forceer altijd fetch om unauthorized / empty notes te kunnen tonen
    let cancelled = false;
    (async () => {
      try {
        setLoadingResp(true);
        const r = await fetch(`/api/seller/${id}/response-time`, { cache: 'no-store' });
        if (!r.ok) throw new Error('resp fetch');
        const d = await r.json();
        if (!cancelled) {
          if (typeof d.averageMinutes === 'number') {
            setResponseMins(d.averageMinutes);
          } else {
            setResponseMins(null);
          }
          if (typeof d.note === 'string') setRespNote(d.note);
        }
      } catch {
        if (!cancelled) {
          setResponseMins(null);
          setRespNote('error');
        }
      } finally {
        if (!cancelled) setLoadingResp(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const mapsLink =
    coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
      ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
      : location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
      : null;

  const startChat = useCallback(async () => {
    if (starting) return;
  // Sta zowel string als numerieke ID's toe; converteer naar string voor API
  const otherUserId = id != null ? String(id) : null;
    if (!otherUserId) {
      window.alert('Geen verkoper ID beschikbaar.');
      return;
    }
    if (profile && profile.id === otherUserId) {
      window.alert('Je kunt jezelf geen bericht sturen.');
      return;
    }
    // Indien niet ingelogd -> naar login
    if (!profile) {
      if (loading) return; // wacht tot profiel geladen
      router.push('/login');
      return;
    }
    try {
      setStarting(true);
      // Voeg bearer token toe als fallback wanneer cookies niet doorkomen in route handler
      let token: string | null = null;
      try {
        const supa = createClient();
        const { data: { session } } = await supa.auth.getSession();
        token = session?.access_token || null;
  } catch { /* ignore bearer token retrieval issues */ }
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ otherUserId, listingId }),
      });
      const d = await r.json();
      if (r.status === 401 || d.error === 'unauthorized') {
        router.push('/login');
        return;
      }
      if (d.conversation?.id) {
        // Fire global event to open chat dock
        window.dispatchEvent(new CustomEvent('ocaso:open-chat-dock', {
          detail: {
            conversationId: d.conversation.id,
            // fallback title
            title: name || 'Chat'
          }
        }));
        // Also dispatch conversation-started so chats list updates instantly for the starter
        window.dispatchEvent(new CustomEvent('ocaso:conversation-started', {
          detail: {
            conversation: {
              id: d.conversation.id,
              participants: d.conversation.participants || [],
              updated_at: d.conversation.created_at || new Date().toISOString(),
              lastMessage: null,
              unread: 0,
              listing_id: d.conversation.listing_id || null,
              listing: null,
            }
          }
        }));
      } else if (d.error) {
        window.alert('Kon chat niet starten: ' + d.error);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Chat start fout', e);
      window.alert('Onbekende fout bij starten van chat');
    } finally {
      setStarting(false);
    }
  }, [starting, id, profile, loading, router, listingId, name]);

  return (
    <aside className="lg:col-span-5">
      <section className="rounded-2xl border bg-white/50 backdrop-blur-sm p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar src={avatar} name={name ?? undefined} size={72} rounded="full" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {id ? (
                <Link
                  href={isBusiness ? `/business/${id}` : `/seller/${id}`}
                  className="font-semibold text-lg leading-tight truncate max-w-full hover:underline decoration-emerald-600/60 decoration-2 underline-offset-2"
                >
                  {name}
                </Link>
              ) : (
                <h3 className="font-semibold text-lg leading-tight truncate max-w-full">{name}</h3>
              )}
              {isBusiness && (
                <Tooltip content="Geregistreerde onderneming met geldig BTW-nummer">
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium shadow-sm cursor-help">
                    Bedrijf
                  </span>
                </Tooltip>
              )}
              {isVerified && (
                <Tooltip content="Geverifieerde gebruiker en ondersteunt betaling via een eigen betaalterminal">
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium shadow-sm cursor-help">
                    Vertrouwd
                  </span>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
              <span>Aangesloten {formatJoined(seller.joinedISO)}</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              {rating !== null && (reviewCount ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <RatingStars rating={Number(rating)} size={14} />
                  <span className="font-medium">{Number(rating).toFixed(1)}</span>
                  {reviewCount !== null && <span className="text-gray-500">({reviewCount})</span>}
                </span>
              ) : reviewCount === 0 ? (
                <span className="text-sm text-gray-500">Nog geen reviews</span>
              ) : (
                <span className="text-sm text-gray-400">Beoordeling volgt</span>
              )}
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50/60 p-3 border border-gray-100">
          <div className="flex flex-col items-center py-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Reviews</span>
            <span className="mt-1 text-sm font-medium text-gray-800">{reviewCount ?? '—'}</span>
          </div>
          <div className="flex flex-col items-center py-1 border-x border-gray-100">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Verkoop</span>
            <span className="mt-1 text-sm font-medium text-gray-800">{sales ? Intl.NumberFormat('nl-BE').format(sales) : '—'}</span>
          </div>
            <div className="flex flex-col items-center py-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Respons</span>
            <span className="mt-1 text-sm font-medium text-gray-800">
              {responseMins != null
                ? `${responseMins}m`
                : loadingResp
                  ? '…'
                  : respNote === 'unauthorized'
                    ? 'Privé'
                    : responseRatePct != null
                      ? `${Math.round(responseRatePct)}%`
                      : '—'}
            </span>
          </div>
        </div>

        {/* Acties */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href={id ? `/seller/${id}` : '#'}
            className="flex-1 inline-flex items-center justify-center rounded-full bg-primary text-gray-900 px-3 py-1.5 text-[13px] font-semibold border border-primary/40 hover:bg-primary/80 active:scale-[.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 shadow-sm"
          >
            Profiel
          </Link>
          <button
            type="button"
            disabled={starting}
            onClick={startChat}
            className="flex-1 inline-flex items-center justify-center rounded-full bg-gray-800 text-white px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-900 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-sm"
          >
            {starting ? 'Bezig…' : 'Contacteer'}
          </button>
        </div>

        {/* Info lijst */}
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-white">
          <div className="grid grid-cols-2 gap-3 p-4 text-sm">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Locatie</p>
              <p className="font-medium text-gray-800">{location ?? (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Onbekend')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Verzending</p>
              <p className="font-medium text-gray-800">{shippingAvgDays ? `${shippingAvgDays} dagen` : 'Afhalen / n.v.t.'}</p>
            </div>
            {/* Verwijderd: Annuleringen & Laatst gezien op verzoek */}
          </div>
          {(coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) || (location && location !== 'Onbekend') ? (
            <div className="p-3">
              {coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng) ? (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    title="Locatie kaart"
                    src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`}
                    width="100%"
                    height="180"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : location && location !== 'Onbekend' ? (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    title="Locatie kaart"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&z=12&output=embed`}
                    width="100%"
                    height="180"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : null}
              {mapsLink && (
                <div className="mt-2 text-right">
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                    aria-label="Open locatie in Google Maps"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </aside>
  );
}