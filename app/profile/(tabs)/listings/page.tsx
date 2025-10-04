'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import EditListingModal from '@/components/EditListingModal';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';

/* ----------------------------- types & utils ----------------------------- */
type Listing = {
  id: string;
  title: string;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  condition?: string | null;
  created_at?: string | null;
  status?: 'active' | 'paused' | 'sold' | 'draft' | string | null;
  sold?: boolean | null;
  sold_via_ocaso?: boolean | null;
  views?: number | null;
  saves?: number | null;
  bids?: number | null;
  highest_bid?: number | null;
  last_bid_at?: string | null;
  location?: string | null;
  allow_offers?: boolean | null;
  imageUrl?: string | null; // <- uniform veld vanuit API
  description?: string | null;
  subcategory?: string | null;
  images?: string[] | null;
  main_photo?: string | null;
};

type Bid = {
  amount: number;
  created_at?: string;
  bidder_id?: string;
  bidder_name?: string;
};

function formatCurrency(v?: number | null, ccy = 'EUR') {
  if (v == null) return '—';
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: ccy }).format(v);
}
function sum(arr: Array<number | null | undefined>) {
  return arr.reduce((acc: number, x) => acc + (x ?? 0), 0);
}
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

/* ---------------------------------- page --------------------------------- */
export default function ListingsPage() {
  const supabase = createClient();
  const { push } = useToast();
  const { profile } = useProfile();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Listing[]>([]);
  const [unreadBids, setUnreadBids] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sold' | 'paused' | 'draft'>('all');
  const [sort, setSort] = useState<'new' | 'views' | 'bids' | 'price-asc' | 'price-desc'>('new');
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [bidsOpenId, setBidsOpenId] = useState<string | null>(null);
  const [bidsList, setBidsList] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [soldValue, setSoldValue] = useState<number>(0);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
  const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          setErr('Je bent niet aangemeld.');
          return;
        }

        const url = `/api/profile/listings?seller_id=${encodeURIComponent(user.id)}&include=metrics=1`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(`Server ${r.status}`);
        const d = await r.json();

        // API levert al imageUrl (publieke URL). Niet meer rommelen in de UI.
        type ApiListing = {
          id?: string;
          title?: string;
          price?: number | null;
          currency?: string | null;
          imageUrl?: string | null;
          images?: string[] | null;
          main_photo?: string | null;
          category?: string | null;
          subcategory?: string | null;
          condition?: string | null;
          created_at?: string | null;
          status?: string | null;
          sold?: boolean | null;
          sold_via_ocaso?: boolean | null;
          sale_channel?: string | null;
          views?: number | null;
          saves?: number | null;
          bids?: number | null;
          highest_bid?: number | null;
          last_bid_at?: string | null;
          location?: string | null;
          allow_offers?: boolean | null;
          allowOffers?: boolean | null;
          description?: string | null;
          metrics?: {
            views?: number | null;
            saves?: number | null;
            bids?: number | null;
            highest_bid?: number | null;
            last_bid_at?: string | null;
          };
        };

        const rows: Listing[] = (d.items || []).map((x: ApiListing) => ({
          id: x.id ?? '',
          title: x.title ?? '—',
          price: x.price ?? null,
          currency: x.currency ?? 'EUR',
          imageUrl: x.imageUrl ?? null, // <- hier
          images: x.images ?? null,
          main_photo: x.main_photo ?? null,
          category: x.category ?? null,
          subcategory: x.subcategory ?? null,
          condition: x.condition ?? null,
          created_at: x.created_at ?? null,
          status: x.status ?? (x.sold ? 'sold' : 'active'),
          sold: x.sold ?? (x.status === 'sold'),
          sold_via_ocaso: x.sold_via_ocaso ?? (x.sale_channel === 'ocaso'),
          views: x.views ?? x.metrics?.views ?? 0,
          saves: x.saves ?? x.metrics?.saves ?? 0,
          bids: x.bids ?? x.metrics?.bids ?? 0,
          highest_bid: x.highest_bid ?? x.metrics?.highest_bid ?? null,
          last_bid_at: x.last_bid_at ?? x.metrics?.last_bid_at ?? null,
          location: x.location ?? null,
          allow_offers: x.allow_offers ?? x.allowOffers ?? false,
          description: x.description ?? null,
        }));

        setItems(rows);
        // Dispatch global event zodat andere hooks (bv. useUnreadBids) niet opnieuw hoeven te fetchen
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ocaso:listings-loaded', { detail: { items: rows } }));
        }
        // Init unread badge counts from server (listing_bid_reads), fallback naar localStorage
        try {
          const ids = rows.map(r => r.id);
          const { data: reads } = await supabase
            .from('listing_bid_reads')
            .select('listing_id,last_seen_count')
            .in('listing_id', ids);
          const serverMap: Record<string, number> = {};
          (reads || []).forEach(r => { if (r && r.listing_id) serverMap[r.listing_id] = r.last_seen_count || 0; });
          const raw = typeof window !== 'undefined' ? localStorage.getItem('ocaso:lastSeenBids') : null;
          const lastSeen: Record<string, number> = raw ? JSON.parse(raw) : {};
          const nextUnread: Record<string, number> = {};
          rows.forEach((l) => {
            const current = l.bids || 0;
            const base = serverMap[l.id] ?? lastSeen[l.id] ?? current;
            lastSeen[l.id] = base; // sync local to base
            const diff = Math.max(0, current - base);
            if (diff > 0) nextUnread[l.id] = diff;
          });
          setUnreadBids(nextUnread);
          if (typeof window !== 'undefined') localStorage.setItem('ocaso:lastSeenBids', JSON.stringify(lastSeen));
          // Upsert server reads to keep in sync (no-op if unchanged)
          const payload = Object.entries(lastSeen).map(([listing_id, last_seen_count]) => ({ listing_id, user_id: user.id, last_seen_count }));
          if (payload.length) {
            await supabase.from('listing_bid_reads').upsert(payload, { onConflict: 'user_id,listing_id' });
            try { window.dispatchEvent(new Event('ocaso:bids-seen-changed')); } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      } catch (e) {
        console.error(e);
        setErr('Kon zoekertjes niet laden.');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Realtime: nieuwe biedingen incrementeel tonen als unread badge
  useEffect(() => {
    if (!items.length) return;
    const listingIds = new Set(items.map((l) => l.id));
    const channel = supabase
      .channel('bids:inserts:all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, (payload: { new: { listing_id: string; amount?: number } }) => {
        const bid = payload.new;
        if (!bid?.listing_id || !listingIds.has(bid.listing_id)) return;
        // Update items (bids count and maybe highest_bid)
        setItems((prev) => prev.map((l) => {
          if (l.id !== bid.listing_id) return l;
          const next = { ...l, bids: (l.bids || 0) + 1 } as Listing;
          if (typeof bid.amount === 'number') {
            const hb = next.highest_bid == null ? -Infinity : Number(next.highest_bid);
            if (bid.amount > hb) next.highest_bid = bid.amount;
          }
          next.last_bid_at = new Date().toISOString();
          return next;
        }));
        // Update unread counters and persist last seen map (do not mark seen here)
        setUnreadBids((prev) => ({ ...prev, [bid.listing_id]: (prev[bid.listing_id] || 0) + 1 }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, items]);

  // Haal verkochte waarde op
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile/stats', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSoldValue(data.soldValue || 0);
        }
      } catch (e) {
        console.warn('Kon verkochte waarde niet ophalen:', e);
      }
    })();
  }, []);

  async function markBidsSeen(listingId: string, count: number) {
    setUnreadBids((prev) => ({ ...prev, [listingId]: 0 }));
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('ocaso:lastSeenBids') : null;
      const lastSeen: Record<string, number> = raw ? JSON.parse(raw) : {};
      lastSeen[listingId] = count;
      if (typeof window !== 'undefined') localStorage.setItem('ocaso:lastSeenBids', JSON.stringify(lastSeen));
      // Persist to server as well
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from('listing_bid_reads').upsert({ user_id: user.id, listing_id: listingId, last_seen_count: count }, { onConflict: 'user_id,listing_id' });
      }
    } catch { /* ignore */ }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = items.filter((it) => (q ? (it.title || '').toLowerCase().includes(q) : true));
    if (statusFilter !== 'all') {
      rows = rows.filter((it) => {
        const st = (it.status || '').toLowerCase();
        if (statusFilter === 'active') return st === 'active';
        if (statusFilter === 'sold') return st === 'sold' || !!it.sold;
        if (statusFilter === 'paused') return st === 'paused';
        if (statusFilter === 'draft') return st === 'draft';
        return true;
      });
    }
    switch (sort) {
      case 'new':
        rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'views':
        rows.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'bids':
        rows.sort((a, b) => (b.bids || 0) - (a.bids || 0));
        break;
      case 'price-asc':
        rows.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        rows.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
    }
    return rows;
  }, [items, query, statusFilter, sort]);

  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((x) => (x.status || '').toLowerCase() === 'active').length;
    const sold = items.filter((x) => (x.sold || (x.status || '').toLowerCase() === 'sold')).length;
    const views = sum(items.map((x) => x.views));
    return { total, active, sold, views, soldValue };
  }, [items, soldValue]);

  async function updateFlags(id: string, patch: Partial<Pick<Listing, 'sold' | 'sold_via_ocaso' | 'status'>>) {
    setBusyIds((m) => ({ ...m, [id]: true }));
    try {
      const res = await fetch('/api/listings/flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error('Flags opslaan mislukt');
      setItems((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                sold: patch.sold ?? l.sold,
                sold_via_ocaso: patch.sold_via_ocaso ?? l.sold_via_ocaso,
                status:
                  patch.status ??
                  (patch.sold === true
                    ? 'sold'
                    : patch.sold === false && (l.status === 'sold' || l.sold)
                    ? 'active'
                    : l.status),
              }
            : l
        )
      );
    } catch (e) {
      alert('Bewaren mislukt. Probeer opnieuw.');
    } finally {
      setBusyIds((m) => ({ ...m, [id]: false }));
    }
  }

  async function removeListing(id: string) {
    if (!confirm('Dit zoekertje verwijderen?')) return;
    setBusyIds((m) => ({ ...m, [id]: true }));
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert('Verwijderen mislukt. Probeer opnieuw.');
    } finally {
      setBusyIds((m) => ({ ...m, [id]: false }));
    }
  }

  async function openBidsModal(listingId: string) {
    setBidsOpenId(listingId);
    setBidsLoading(true);
    // Haal biedingen op voor deze listing
    const res = await fetch(`/api/bids?listing_id=${listingId}`);
    const data = await res.json();
    setBidsList(data.items ?? []);
    setBidsLoading(false);
    // Markeer als gelezen met de actuele lengte (badge reset)
  const currentCount = Array.isArray(data.items) ? data.items.length : (items.find(x => x.id === listingId)?.bids || 0);
  await markBidsSeen(listingId, currentCount);
  try { window.dispatchEvent(new Event('ocaso:bids-seen-changed')); } catch (e) { /* noop */ }
  }
  function closeBidsModal() {
    setBidsOpenId(null);
    setBidsList([]);
  }

  async function handleContact(bid: Bid) {
    if (!profile) {
      router.push('/login');
      return;
    }
    if (!bidsOpenId) return;

    try {
      // Start chat met de bieder
      const otherUserId = bid.bidder_id;
      const listingId = bidsOpenId;

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
            title: bid.bidder_name || 'Chat met bieder'
          }
        }));
        // Also dispatch conversation-started so chats list updates instantly
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
        // Sluit de biedingen modal
        closeBidsModal();
      } else if (d.error) {
        alert('Kon chat niet starten: ' + d.error);
      }
    } catch (e) {
      console.error('Chat start fout', e);
      alert('Onbekende fout bij starten van chat');
    }
  }

  // Edit modal functions
  function openEditModal(listing: Listing) {
    setSelectedListing(listing);
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setSelectedListing(null);
  }

  async function handleEditSave(updatedData: Partial<Listing>) {
    if (!selectedListing) return;

    // Call API to update listing
    const res = await fetch(`/api/listings/${selectedListing.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
    if (!res.ok) throw new Error('Update failed');

    // Update local state
    setItems((prev) =>
      prev.map((l) =>
        l.id === selectedListing.id ? { ...l, ...updatedData } : l
      )
    );
  }

  // Accept a bid: ensure conversation with bidder and post acceptance message
  async function handleAccept(bid: Bid) {
    const listingId = bidsOpenId;
    if (!listingId) return;
    if (!bid?.bidder_id) {
      push('Bieder onbekend');
      return;
    }
    setBusyIds((m) => ({ ...m, [listingId]: true }));
    try {
      // get access token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
  if (!token) { window.location.href = '/login'; return; }

      // Ensure conversation exists (seller <-> bidder)
      const convRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otherUserId: String(bid.bidder_id), listingId }),
      });
      const convJson = await convRes.json();
      if (!convRes.ok) throw new Error(convJson?.error || 'Kon gesprek niet aanmaken');
      const conversationId = convJson?.conversation?.id || convJson?.conversationId;
  if (!conversationId) throw new Error('Geen gesprek gevonden');

  // Post acceptance message from seller to bidder.
  // The chat UI will detect the plain acceptance text and show the pay button below the message.
  const bodyText = 'Uw bod werd aanvaard';
      const msgRes = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: bodyText }),
      });
      if (!msgRes.ok) {
        let txt = 'Bericht kon niet verzonden worden';
        try { txt = await msgRes.text(); } catch { /* noop */ }
        throw new Error(txt || 'Berichtfout');
      }

      // Close modal and refresh bids list
      setBidsOpenId(null);
      setBidsList([]);
      try { window.dispatchEvent(new Event('ocaso:bids-seen-changed')); } catch { /* noop */ }
      // Feedback via toast
      push('Bod geaccepteerd — bieder geïnformeerd.');
    } catch (e) {
      push((e as Error)?.message || 'Accepteren mislukt');
    } finally {
      setBusyIds((m) => ({ ...m, [bidsOpenId || '']: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white">
      {/* HERO */}
      <header className="relative border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%)]" />
        <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Profiel</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mijn zoekertjes</h1>
            <p className="max-w-2xl text-sm text-neutral-600">
              Bekijk prestaties en beheer je zoekertjes. Raadpleeg snel bezoekers, favorieten, biedingen en verkoopstatus.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {loading ? (
          <div className="space-y-6">
            <SkeletonCard h={80} />
            <SkeletonCard h={300} />
          </div>
        ) : err ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">{err}</div>
        ) : (
          <>
            {/* Stats */}
            <section className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              <StatCard label="Totaal" value={metrics.total} />
              <StatCard label="Actief" value={metrics.active} />
              <StatCard label="Verkocht" value={metrics.sold} />
              <StatCard label="Bezoekers" value={metrics.views ?? 0} />
              <StatCard label="Verkochte waarde" value={`€${metrics.soldValue}`} />
            </section>

            {/* Controls */}
            <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Zoek op titel…"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'sold', 'paused', 'draft'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setStatusFilter(k)}
                      className={clsx(
                        'rounded-full px-3 py-1.5 text-sm border transition',
                        statusFilter === k
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      )}
                    >
                      {k === 'all' ? 'Alle' : k === 'active' ? 'Actief' : k === 'sold' ? 'Verkocht' : k === 'paused' ? 'Pauzeren' : 'Concept'}
                    </button>
                  ))}
                </div>
                <div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as 'new' | 'views' | 'bids' | 'price-asc' | 'price-desc')}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="new">Nieuwste eerst</option>
                    <option value="views">Meeste bezoekers</option>
                    <option value="bids">Meeste biedingen</option>
                    <option value="price-asc">Prijs ↑</option>
                    <option value="price-desc">Prijs ↓</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600 shadow-sm">
                Geen zoekertjes gevonden.
              </div>
            ) : (
              <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="hidden w-full min-w-[960px] md:block">
                  <table className="w-full table-fixed">
                    <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-600">
                      <tr>
                        <th className="px-3 py-3 text-left w-[72px]">Foto</th>
                        <th className="px-3 py-3 text-left">Titel</th>
                        <th className="px-3 py-3 text-right w-28">Prijs</th>
                        <th className="px-3 py-3 text-center w-24">Bezoekers</th>
                        <th className="px-3 py-3 text-center w-24">Opgeslagen</th>
                        <th className="px-3 py-3 text-center w-32">Biedingen</th>
                        <th className="px-3 py-3 text-center w-28">Status</th>
                        <th className="px-3 py-3 text-center w-36">Verkocht / via OCASO</th>
                        <th className="px-3 py-3 text-right w-40">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((it) => (
                        <tr key={it.id} className="align-middle">
                          <td className="px-3 py-3">
                            <Link href={`/listings/${it.id}`} passHref legacyBehavior>
                              <a className="block relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={it.imageUrl || ''}
                                  alt="Hoofdafbeelding van zoekertje"
                                  className="w-12 h-12 rounded object-cover border bg-white"
                                />
                                {(unreadBids[it.id] || 0) > 0 && (
                                  <span
                                    className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-5 min-w-[1.25rem] px-1"
                                    title={`${unreadBids[it.id]} nieuw bod`}
                                  >
                                    {unreadBids[it.id] > 9 ? '9+' : unreadBids[it.id]}
                                  </span>
                                )}
                              </a>
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <Link href={`/listings/${it.id}`} passHref legacyBehavior>
                              <a className="truncate text-sm font-medium hover:underline block">{it.title}</a>
                            </Link>
                            <div className="mt-0.5 text-xs text-neutral-500">
                              {it.category || '—'} • {it.condition || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-sm tabular-nums">
                            {formatCurrency(it.price ?? null, it.currency || 'EUR')}
                          </td>
                          <td className="px-3 py-3 text-center text-sm tabular-nums">{it.views ?? 0}</td>
                          <td className="px-3 py-3 text-center text-sm tabular-nums">{it.saves ?? 0}</td>
                          <td className="px-3 py-3 text-center text-sm">
                            <div className="inline-flex items-center justify-center gap-2">
                              <span className="tabular-nums">{it.bids ?? 0}{(it.allow_offers ?? true) ? '' : ' (uit)'}</span>
                              {(unreadBids[it.id] || 0) > 0 && (
                                <span
                                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-5 min-w-[1.25rem] px-1"
                                  title={`${unreadBids[it.id]} nieuw bod`}
                                >
                                  {unreadBids[it.id] > 9 ? '9+' : unreadBids[it.id]}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">
                              Hoogste: <button
                                className="font-semibold text-emerald-700 underline cursor-pointer"
                                disabled={it.bids === 0}
                                onClick={() => openBidsModal(it.id)}
                              >
                                {it.highest_bid != null ? formatCurrency(it.highest_bid, it.currency || 'EUR') : '—'}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge status={(it.status || '').toLowerCase()} />
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="flex flex-col items-center justify-center gap-2 w-36 h-full">
                              <label className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!it.sold}
                                  disabled={!!busyIds[it.id]}
                                  onChange={(e) => updateFlags(it.id, { sold: e.target.checked })}
                                  className="h-4 w-4 accent-emerald-600 rounded-full border border-gray-300 bg-white transition-shadow focus:ring-2 focus:ring-emerald-200 hover:shadow"
                                />
                                <span className="ml-1 select-none">Verkocht</span>
                              </label>
                              <label className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!it.sold_via_ocaso}
                                  disabled={!!busyIds[it.id]}
                                  onChange={(e) => updateFlags(it.id, { sold_via_ocaso: e.target.checked })}
                                  className="h-4 w-4 accent-emerald-600 rounded-full border border-gray-300 bg-white transition-shadow focus:ring-2 focus:ring-emerald-200 hover:shadow"
                                />
                                <span className="ml-1 select-none">via OCASO</span>
                              </label>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex flex-col items-stretch gap-2 w-36">
                              <button
                                onClick={() => updateFlags(it.id, { status: it.status === 'paused' ? 'active' : 'paused' })}
                                disabled={!!busyIds[it.id]}
                                className={`rounded-full px-3 py-1 text-sm w-full text-center transition ${it.status === 'paused' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'} disabled:opacity-50`}
                              >
                                {it.status === 'paused' ? 'Activeren' : 'Pauzeren'}
                              </button>
                              <button
                                onClick={() => openEditModal(it)}
                                className="rounded-full px-3 py-1 text-sm w-full text-center bg-gray-100 hover:bg-gray-200 transition"
                              >
                                Bewerken
                              </button>
                              <button
                                onClick={() => removeListing(it.id)}
                                disabled={!!busyIds[it.id]}
                                className="rounded-full px-3 py-1 text-sm w-full text-center bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                              >
                                Verwijderen
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="block md:hidden">
                  {filtered.map((it) => (
                    <div key={it.id} className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Link href={`/listings/${it.id}`} passHref legacyBehavior>
                          <a className="block relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={it.imageUrl || ''}
                              alt="Hoofdafbeelding van zoekertje"
                              className="w-12 h-12 rounded object-cover border bg-white"
                            />
                            {(unreadBids[it.id] || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-5 min-w-[1.25rem] px-1">
                                {unreadBids[it.id] > 9 ? '9+' : unreadBids[it.id]}
                              </span>
                            )}
                          </a>
                        </Link>
                        <div className="min-w-0">
                          <Link href={`/listings/${it.id}`} passHref legacyBehavior>
                            <a className="truncate text-sm font-medium hover:underline block">{it.title}</a>
                          </Link>
                          <div className="text-xs text-neutral-500">
                            {formatCurrency(it.price ?? null, it.currency || 'EUR')}
                          </div>
                        </div>
                        <StatusBadge status={(it.status || '').toLowerCase()} className="ms-auto" />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <Metric label="Bezoekers" value={it.views ?? 0} />
                        <Metric label="Opgeslagen" value={it.saves ?? 0} />
                        <Metric
                          label="Biedingen"
                          value={
                            it.highest_bid != null
                              ? `${it.bids ?? 0} • ${formatCurrency(it.highest_bid, it.currency || 'EUR')}`
                              : (it.bids ?? 0)
                          }
                        />
                        {(unreadBids[it.id] || 0) > 0 && (
                          <div className="col-span-3 mt-1">
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-5 min-w-[1.25rem] px-1">
                              {unreadBids[it.id] > 9 ? '9+' : unreadBids[it.id]}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 w-36">
                        <button
                          onClick={() => updateFlags(it.id, { status: it.status === 'paused' ? 'active' : 'paused' })}
                          disabled={!!busyIds[it.id]}
                          className={`rounded-full px-3 py-1 text-sm w-full text-center transition ${it.status === 'paused' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'} disabled:opacity-50`}
                        >
                          {it.status === 'paused' ? 'Activeren' : 'Pauzeren'}
                        </button>
                        <Link
                          href={`/listings/${it.id}`}
                          className="rounded-full px-3 py-1 text-sm w-full text-center bg-gray-100 hover:bg-gray-200 transition"
                        >
                          Bewerken
                        </Link>
                        <button
                          onClick={() => removeListing(it.id)}
                          disabled={!!busyIds[it.id]}
                          className="rounded-full px-3 py-1 text-sm w-full text-center bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Verwijderen
                        </button>
                        <label className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-xs">
                          <input
                            type="checkbox"
                            checked={!!it.sold}
                            disabled={!!busyIds[it.id]}
                            onChange={(e) => updateFlags(it.id, { sold: e.target.checked })}
                            className="h-4 w-4 accent-emerald-600 rounded-full border border-gray-200 bg-white"
                          />
                          <span className="ml-1">Verkocht</span>
                        </label>
                        <label className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-xs">
                          <input
                            type="checkbox"
                            checked={!!it.sold_via_ocaso}
                            disabled={!!busyIds[it.id]}
                            onChange={(e) => updateFlags(it.id, { sold_via_ocaso: e.target.checked })}
                            className="h-4 w-4 accent-emerald-600 rounded-full border border-gray-200 bg-white"
                          />
                          <span className="ml-1">via OCASO</span>
                        </label>
                        <button
                          onClick={() => updateFlags(it.id, { status: it.status === 'paused' ? 'active' : 'paused' })}
                          disabled={!!busyIds[it.id]}
                          className={`w-full rounded-lg border px-3 py-1.5 text-sm ${it.status === 'paused' ? 'border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50' : 'border-yellow-200 text-yellow-700 bg-white hover:bg-yellow-50'} disabled:opacity-50`}
                        >
                          {it.status === 'paused' ? 'Activeren' : 'Pauzeren'}
                        </button>
                        <button
                          onClick={() => openEditModal(it)}
                          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => removeListing(it.id)}
                          disabled={!!busyIds[it.id]}
                          className="w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {bidsOpenId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeBidsModal}>
          <div
            className="bg-white rounded-xl w-full max-w-lg border border-neutral-200 shadow-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="px-6 py-4 border-b">
              <div className="text-base font-semibold text-gray-900">Alle biedingen</div>
              <div className="mt-1 text-sm text-neutral-600 truncate">{items.find(x => x.id === bidsOpenId)?.title ?? ''}</div>
            </div>
            {bidsLoading ? (
              <div className="px-6 py-4 text-sm text-gray-500">Laden...</div>
            ) : bidsList.length > 0 ? (
              <div className="px-6 py-4 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {bidsList.sort((a, b) => b.amount - a.amount).map((bid: Bid, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-4 text-sm text-gray-800 py-2 px-2 rounded bg-neutral-50 border border-neutral-100">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-semibold text-emerald-700">€ {bid.amount}</span>
                        <span className="text-xs text-gray-500">{bid.created_at ? new Date(bid.created_at).toLocaleString('nl-BE') : ''}</span>
                        <span className="text-xs text-gray-700 font-medium">{bid.bidder_name ?? 'Onbekende gebruiker'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"
                          onClick={() => handleAccept(bid)}
                        >
                          Accepteer
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
                          onClick={() => handleContact(bid)}
                        >
                          Contacteer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="px-6 py-4 text-sm text-gray-500">Er zijn nog geen biedingen.</div>
            )}
            <div className="px-6 py-3 border-t flex justify-end">
              <button
                type="button"
                className="px-4 py-1 rounded bg-neutral-200 text-gray-700 text-sm font-medium hover:bg-neutral-300 transition"
                onClick={closeBidsModal}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      <EditListingModal
        listing={selectedListing}
        open={editModalOpen}
        onClose={closeEditModal}
        onSave={handleEditSave}
      />
    </div>
  );
}
function SkeletonCard({ h = 180 }: { h?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-10 w-full bg-neutral-50" />
      <div className="p-6">
        <div className="h-4 w-40 rounded bg-neutral-100" />
        <div className="mt-4 h={[1px]} w-full bg-neutral-100" />
        <div className="mt-4" style={{ height: h }}>
          <div className="h-full w-full rounded bg-neutral-50" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-neutral-50 p-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    sold: 'bg-neutral-200 text-neutral-700',
    paused: 'bg-amber-100 text-amber-700',
    draft: 'bg-blue-100 text-blue-700',
  };
  const label: Record<string, string> = {
    active: 'Actief',
    sold: 'Verkocht',
    paused: 'Pauzeren',
    draft: 'Concept',
  };
  const cls = map[status] || 'bg-neutral-100 text-neutral-700';
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-1 text-xs', cls, className)}>
      {label[status] || status || '—'}
    </span>
  );
}
