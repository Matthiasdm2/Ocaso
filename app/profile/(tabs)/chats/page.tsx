"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Avatar from '@/components/Avatar';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';

interface ConversationApiRow {
  id: string;
  participants: string[];
  updated_at: string;
  lastMessage: null | { id: string; body: string; created_at: string; sender_id: string };
  unread: number;
  listing_id?: string | null;
  listing?: { id: string; title: string; image: string | null } | null;
}

interface ProfileLiteFetch { id: string; full_name: string | null; avatar_url: string | null }

export default function ChatsTabPage() {
  const { profile } = useProfile();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ConversationApiRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLiteFetch>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const headers: Record<string,string> = {};
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch {
        // ignore auth session errors; proceed unauthenticated
      }
      try {
        const r = await fetch('/api/messages', { cache: 'no-store', headers });
        if (!r.ok) {
          throw new Error(`Server gaf status ${r.status}`);
        }
        const d = await r.json();
        if (!cancelled && d.conversations) setItems(d.conversations);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Kon gesprekken niet laden';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [supabase]);

  function retryFetch() {
    // simple retry by re-running the effect logic
    setError(null);
    setLoading(true);
    (async () => {
      const headers: Record<string,string> = {};
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch {/* ignore */}
      try {
        const r = await fetch('/api/messages', { cache: 'no-store', headers });
        if (!r.ok) throw new Error(`Server gaf status ${r.status}`);
        const d = await r.json();
        if (d.conversations) setItems(d.conversations);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Kon gesprekken niet laden';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }

  useEffect(() => {
    if (!profile) return;
    const others = Array.from(new Set(items.map(c => c.participants.find(p => p !== profile.id)).filter(Boolean))) as string[];
    if (others.length === 0) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', others);
      if (data) {
        const map: Record<string, ProfileLiteFetch> = {};
        data.forEach(p => { map[p.id] = p; });
        setProfilesMap(m => ({ ...m, ...map }));
      }
    })();
  }, [items, profile, supabase]);

  useEffect(() => {
    if (!profile) return;
    type NewMsg = { conversation_id: string; created_at: string; body: string; sender_id: string; id: string };
    const channel = supabase.channel('messages:list:all').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, (payload: { new: NewMsg }) => {
      const newMsg = payload.new;
      setItems(prev => {
        const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
        if (idx === -1) {
          // Fetch conversation meta (participants) so we can add it
          (async () => {
            try {
              const { data: conv } = await supabase
                .from('conversations')
                .select('id, participants, updated_at')
                .eq('id', newMsg.conversation_id)
                .maybeSingle();
              if (!conv) return;
              setItems(curr => {
                // Avoid race double insert
                if (curr.some(c => c.id === conv.id)) return curr;
                const unread = newMsg.sender_id === profile.id ? 0 : 1;
                const newConv: ConversationApiRow = {
                  id: conv.id,
                  participants: conv.participants || [],
                  updated_at: new Date().toISOString(),
                  lastMessage: { id: newMsg.id, body: newMsg.body, created_at: newMsg.created_at, sender_id: newMsg.sender_id },
                  unread,
                };
                return [newConv, ...curr];
              });
            } catch { /* ignore */ }
          })();
          return prev; // temporary until async adds
        }
        const updated = [...prev];
        const conv = { ...updated[idx] } as ConversationApiRow;
        if (newMsg.sender_id !== profile.id) {
          conv.unread = (conv.unread || 0) + 1;
        }
        conv.lastMessage = { id: newMsg.id, body: newMsg.body, created_at: newMsg.created_at, sender_id: newMsg.sender_id };
        conv.updated_at = new Date().toISOString();
        updated.splice(idx, 1);
        return [conv, ...updated];
      });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, profile]);

  // Realtime: pick up newly created conversations (before any message is sent)
  useEffect(() => {
    if (!profile) return;
    type ConvInsert = { id: string; participants: string[]; updated_at: string; listing_id?: string | null };
    const channel = supabase.channel('conversations:inserts').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'conversations'
    }, (payload: { new: ConvInsert }) => {
      const conv = payload.new;
      if (!Array.isArray(conv.participants) || !conv.participants.includes(profile.id)) return;
      setItems(prev => {
        if (prev.some(c => c.id === conv.id)) return prev;
        const newConv: ConversationApiRow = {
          id: conv.id,
            participants: conv.participants,
            updated_at: conv.updated_at || new Date().toISOString(),
            lastMessage: null,
            unread: 0,
            listing_id: conv.listing_id ?? null,
            listing: undefined
        };
        return [newConv, ...prev];
      });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, profile]);

  // Enrich listings for any conversations that lack listing info
  useEffect(() => {
    (async () => {
      const missing = items.filter(c => c.listing_id && c.listing === undefined).map(c => c.listing_id!) as string[];
      const unique = Array.from(new Set(missing));
      if (!unique.length) return;
      interface ListingLite { id: string; title: string; main_photo: string | null; images: string[] | null }
      const { data } = await supabase.from('listings').select('id,title,main_photo,images').in('id', unique) as { data: ListingLite[] | null };
      if (!data) return;
      const map: Record<string, { id: string; title: string; image: string | null }> = {};
      data.forEach(l => {
        const imgs = Array.isArray(l.images) ? l.images : [];
        const image = l.main_photo || (imgs.length ? imgs[0] : null);
        map[l.id] = { id: l.id, title: l.title, image };
      });
      setItems(prev => prev.map(c => c.listing_id && map[c.listing_id] && c.listing === undefined ? { ...c, listing: map[c.listing_id] } : c));
    })();
  }, [items, supabase]);

  // Listen for conversation created (sender immediate add)
  useEffect(() => {
    function onStarted(e: Event) {
      const detail = (e as CustomEvent<{ conversation: ConversationApiRow }>).detail;
      if (!detail?.conversation) return;
      setItems(prev => prev.some(c => c.id === detail.conversation.id) ? prev : [detail.conversation, ...prev]);
    }
    window.addEventListener('ocaso:conversation-started', onStarted as EventListener);
    return () => window.removeEventListener('ocaso:conversation-started', onStarted as EventListener);
  }, []);

  useEffect(() => {
    function onRead(event: Event) {
      const custom = event as CustomEvent<{ id?: string }>;
      const id = custom.detail?.id;
      if (!id) return;
      setItems(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    }
    window.addEventListener('ocaso:conversation-read', onRead as EventListener);
    return () => window.removeEventListener('ocaso:conversation-read', onRead as EventListener);
  }, []);

  const rows = useMemo(() => items, [items]);
  const totalUnread = useMemo(() => items.reduce((sum, c) => sum + (c.unread || 0), 0), [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold leading-none">Chats</h2>
          {totalUnread > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 text-white text-[10px] font-semibold h-5 w-5 shadow-sm"
              title={`${totalUnread} ongelezen bericht${totalUnread === 1 ? '' : 'en'}`}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
        <Link href="/messages" className="text-xs text-gray-500 hover:underline">Volledig scherm</Link>
      </div>
      {loading && <div className="text-sm text-gray-500">Laden…</div>}
      {!loading && error && (
        <div className="text-sm text-red-600 flex items-center gap-3 bg-red-50 border border-red-200 p-3 rounded">
          <span>{error}</span>
          <button
            type="button"
            onClick={retryFetch}
            className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          >Opnieuw</button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="text-sm text-gray-500">Nog geen gesprekken.</div>
      )}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-white">
        {rows.map(c => {
          const otherId = profile ? c.participants.find(p => p !== profile.id) : undefined;
          const other = otherId ? profilesMap[otherId] : undefined;
            const title = other?.full_name || 'Onbekende gebruiker';
            const last = c.lastMessage;
            return (
              <li key={c.id} className="hover:bg-gray-50 transition">
                <button
                  type="button"
                  onClick={() => {
                    // Open as floating dock instead of hard navigation
                    window.dispatchEvent(new CustomEvent('ocaso:open-chat-dock', {
                      detail: { conversationId: c.id, title: c.listing?.title || 'Chat' }
                    }));
                    // Optionally still navigate to detail page (comment out if not wanted)
                    // router.push(`/profile/chats/${c.id}`);
                  }}
                  className="flex items-center gap-4 p-4 w-full text-left"
                >
                  <div className="relative w-14 h-14 shrink-0">
                    {c.listing?.image ? (
                      <Image src={c.listing.image} alt={c.listing.title} width={56} height={56} className="w-14 h-14 rounded object-cover border" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-gray-100 border flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                    )}
                    <div className="absolute -bottom-1 -right-1">
                      <Avatar src={other?.avatar_url || null} name={other?.full_name || 'Gebruiker'} size={20} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium truncate max-w-[150px]" title={c.listing?.title || c.listing_id || 'Listing'}>{c.listing?.title || 'Zoekertje'}</span>
                      <span className="text-gray-400">|</span>
                      <span className="truncate max-w-[120px]" title={title}>{title}</span>
                      {c.unread > 0 && (
                        <span
                          className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold h-5 w-5"
                          title={`${c.unread} ongelezen`}
                        >
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                      {last && <span className="ml-auto text-[11px] text-gray-500">{new Date(last.created_at).toLocaleTimeString()}</span>}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-1">
                      {last ? last.body : 'Geen berichten'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-auto pl-4 border-l border-transparent group-hover:border-gray-100">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(new CustomEvent('ocaso:open-chat-dock', {
                            detail: { conversationId: c.id, title: c.listing?.title || 'Chat' }
                          }));
                        }}
                        className="px-2 py-1 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >Open</button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile/chats/${c.id}`);
                        }}
                        className="px-2 py-1 rounded text-[11px] bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                      >Volledig</button>
                    </div>
                  </div>
                </button>
              </li>
            );
        })}
      </ul>
    </div>
  );
}
