"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';

type Message = { id: string; sender_id: string; body: string; created_at: string; edited_at?: string | null; deleted_at?: string | null };

export default function ProfileChatPage({ params }: { params: { id: string } }) {
  const chatId = params.id;
  const supabase = createClient();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [peer, setPeer] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);

  const authHeaders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };
    } catch { /* ignore */ }
    return {} as Record<string,string>;
  }, [supabase]);

  const load = useCallback(async () => {
    setError(null);
    const headers = await authHeaders();
    const r = await fetch(`/api/messages/${chatId}`, { cache: "no-store", headers });
    let raw: unknown = {};
    try { raw = await r.json(); } catch { /* ignore */ }
    const d = (typeof raw === 'object' && raw) ? raw as { messages?: Message[]; hasMore?: boolean; error?: string } : {};
    if (r.status === 401) {
      setError('Niet ingelogd');
    } else if (!r.ok) {
      setError(d.error || `Fout (${r.status})`);
    } else if (Array.isArray(d.messages)) {
      setMessages(d.messages);
      setHasMore(!!d.hasMore);
    }
    setLoading(false);
  }, [chatId, authHeaders]);

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
  const headers = await authHeaders();
  const r = await fetch(`/api/messages/${chatId}?before=${encodeURIComponent(oldest.created_at)}`, { headers });
    const d = await r.json();
    if (d.messages && d.messages.length) {
      setMessages(prev => [...d.messages, ...prev]);
      setHasMore(!!d.hasMore);
    } else {
      setHasMore(false);
    }
    setLoadingOlder(false);
  };

  useEffect(() => { load(); }, [load]);

  // Fetch peer profile for avatar
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('participants')
          .eq('id', chatId)
          .maybeSingle();
        const others = Array.isArray(conv?.participants) ? (conv!.participants as string[]).filter(p => p !== profile.id) : [];
        const otherId = others[0];
        if (!otherId) return;
        const { data: p } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherId)
          .maybeSingle();
        if (p) setPeer(p as { id: string; full_name: string | null; avatar_url: string | null });
      } catch { /* ignore */ }
    })();
  }, [supabase, chatId, profile]);

  useEffect(() => {
    if (!profile || messages.length === 0) return;
    const timeout = setTimeout(() => {
      (async () => {
        const headers = await authHeaders();
        fetch(`/api/messages/${chatId}/read`, { method: 'POST', headers }).then(() => {
        window.dispatchEvent(new CustomEvent('ocaso:conversation-read', { detail: { id: chatId } }));
        }).catch(() => {});
      })();
    }, 400);
    return () => clearTimeout(timeout);
  }, [messages, profile, chatId, authHeaders]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chatId}` },
        (payload: { new: Message }) => {
          const newMsg = payload.new;
          setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, chatId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    const headers = await authHeaders();
    const r = await fetch(`/api/messages/${chatId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ text: t }),
    });
    const d = await r.json();
    if (d.message) {
      setMessages((prev) => (prev.find((m) => m.id === d.message.id) ? prev : [...prev, d.message]));
    }
  };

  const startEdit = (m: Message) => { setEditingId(m.id); setEditingText(m.body); };
  const submitEdit = async () => {
    if (!editingId) return;
    const newText = editingText.trim();
    if (!newText) { setEditingId(null); return; }
  const headers = await authHeaders();
  await fetch(`/api/messages/${chatId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ messageId: editingId, text: newText }) });
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, body: newText, edited_at: new Date().toISOString() } : m));
    setEditingId(null);
  };
  const deleteMessage = async (id: string) => {
  const headers = await authHeaders();
  await fetch(`/api/messages/${chatId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ messageId: id }) });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, body: '', deleted_at: new Date().toISOString() } : m));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chat</h2>
        <Link href="/profile/chats" className="text-sm text-gray-600 hover:underline">Alle chats</Link>
      </div>
      <div ref={boxRef} className="card p-4 max-h-[50vh] overflow-y-auto space-y-2">
        {hasMore && (
          <button onClick={loadOlder} disabled={loadingOlder} className="mx-auto mb-2 text-sm text-gray-500 hover:underline disabled:opacity-50">
            {loadingOlder ? 'Meer laden…' : 'Oudere berichten laden'}
          </button>
        )}
  {loading && <div className="text-sm text-gray-500">Laden…</div>}
  {!loading && error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && messages.length === 0 && <div className="text-sm text-gray-500">Nog geen berichten.</div>}
        {messages.map((m) => {
          const mine = profile && m.sender_id === profile.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!mine && (
                <Avatar src={peer?.avatar_url || null} name={peer?.full_name || 'Gebruiker'} size={20} />
              )}
              <div className={`group relative max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? 'bg-primary text-black rounded-br-sm' : 'bg-gray-100 rounded-bl-sm'}`}>
                {editingId === m.id ? (
                  <div className="flex flex-col gap-1">
                    <textarea value={editingText} onChange={e => setEditingText(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm bg-white text-gray-800" rows={2} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingId(null); }} className="text-[11px] text-gray-600 hover:underline">Annuleer</button>
                      <button onClick={submitEdit} className="text-[11px] text-emerald-700 font-semibold hover:underline">Opslaan</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={m.deleted_at ? 'italic text-gray-500' : ''}>{m.deleted_at ? '[verwijderd]' : m.body}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] opacity-70">
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                      {m.edited_at && !m.deleted_at && <span>(bewerkt)</span>}
                    </div>
                  </>
                )}
                {mine && !m.deleted_at && editingId !== m.id && (
                  <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button onClick={() => startEdit(m)} className="text-[10px] bg-white/80 backdrop-blur rounded px-1 border hover:bg-white">Edit</button>
                    <button onClick={() => deleteMessage(m.id)} className="text-[10px] bg-white/80 backdrop-blur rounded px-1 border hover:bg-white">Del</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card p-3 flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Schrijf een bericht…" className="flex-1 rounded-xl border border-gray-200 px-3 py-2" />
        <button onClick={send} className="rounded-xl bg-primary text-black px-4 py-2 font-medium">Verstuur</button>
      </div>
    </div>
  );
}
