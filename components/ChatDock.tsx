"use client";
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
// Chat attachments bucket (must exist as public in Supabase). Override via NEXT_PUBLIC_CHAT_BUCKET
const CHAT_BUCKET = process.env.NEXT_PUBLIC_CHAT_BUCKET || 'chat-attachments';

type Attachment = { id?: string; url: string; content_type: string | null; name?: string };
type Msg = { id: string; from: "me" | "them"; text: string; at: string; edited_at?: string | null; deleted_at?: string | null; attachments?: Attachment[]; read?: boolean; readAt?: string | null };
interface ApiMessage { id: string; sender_id: string; body: string; created_at: string; edited_at?: string | null; deleted_at?: string | null; attachments?: Attachment[]; read?: boolean }

export default function ChatDock({
  chatId,
  title,
  onClose,
  minimized = false,
  onMinimize,
  index = 0,
  bottomOffset = 16,
  shiftLeft = 0,
  bubbleIndex = 0,
  onReportWidth,
}: {
  chatId: string;
  title: string;
  onClose: () => void;
  minimized?: boolean;
  onMinimize?: (v: boolean) => void;
  index?: number;
  bottomOffset?: number;
  shiftLeft?: number;
  bubbleIndex?: number;
  onReportWidth?: (w: number) => void;
}) {
  const supabase = createClient();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [listingImage, setListingImage] = useState<string | null>(null);
  const [bubbleUnread, setBubbleUnread] = useState(0);
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ current?: string; processed: number; total: number; failed: { name: string; reason: string }[] }>({ processed: 0, total: 0, failed: [] });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const markPending = useRef<NodeJS.Timeout | null>(null);
  const [peer, setPeer] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);

  const markRead = useCallback(() => {
    if (!profile) return;
    // debounce to avoid spamming endpoint
    if (markPending.current) clearTimeout(markPending.current);
    markPending.current = setTimeout(async () => {
      const headers: Record<string,string> = {};
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* ignore */ }
      try {
        await fetch(`/api/messages/${chatId}/read`, { method: 'POST', headers });
        window.dispatchEvent(new CustomEvent('ocaso:conversation-read', { detail: { id: chatId } }));
  setBubbleUnread(0);
      } catch { /* ignore */ }
    }, 300);
  }, [chatId, profile, supabase]);

  const load = useCallback(async () => {
    const headers: Record<string,string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch { /* ignore */ }
    setLoadError(null);
    try {
      const r = await fetch(`/api/messages/${chatId}`, { cache: 'no-store', headers });
      let d: unknown = {};
      try { d = await r.json(); } catch { /* ignore */ }
      if (!r.ok) {
        if (process.env.NODE_ENV !== 'production') console.debug('ChatDock load error', r.status, d);
        // Narrow d to object with optional error
        const err = (typeof d === 'object' && d && 'error' in d) ? (d as { error?: string }).error : undefined;
        setLoadError(err || `Fout (${r.status})`);
      } else if (typeof d === 'object' && d && 'messages' in d && Array.isArray((d as { messages: unknown }).messages)) {
  const arr = (d as { messages: ApiMessage[] }).messages;
        const hasListing = (val: unknown): val is { listing_id?: string | null } => {
          return typeof val === 'object' && val !== null && 'listing_id' in val;
        };
        if (hasListing(d)) setListingId(d.listing_id || null);
        if (typeof d === 'object' && d && 'listing' in d && d.listing) {
          const listing = (d as { listing?: { id: string; title: string; image: string | null } }).listing;
          if (listing) {
            setListingTitle(listing.title || null);
            setListingImage(listing.image || null);
          }
        } else {
          setListingTitle(null);
          setListingImage(null);
        }
  const peerLast = (typeof d === 'object' && d && 'peer_last_read_at' in d) ? (d as { peer_last_read_at?: string | null }).peer_last_read_at || null : null;
        setMessages(arr.map((m) => {
          const mine = profile && m.sender_id === profile.id;
            const read = !!m.read;
            return {
              id: m.id,
              from: mine ? 'me' : 'them',
              text: m.deleted_at ? '' : m.body,
              at: m.created_at,
              edited_at: m.edited_at,
              deleted_at: m.deleted_at,
              attachments: m.attachments || [],
              read,
              readAt: read && peerLast ? peerLast : null,
            } as Msg;
        }));
      }
    } catch (e) {
      setLoadError('Netwerkfout');
    } finally {
      setLoaded(true);
    }
  }, [chatId, profile, supabase]);

  useEffect(() => { load(); }, [load]);

  // Fetch peer (other participant) profile for avatar/name
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

  // Mark as read after initial load if we have messages
  useEffect(() => {
    if (!minimized && messages.length) markRead();
  }, [messages, minimized, markRead]);

  // Verbeterde fallback + polling totdat alle eigen ongelezen berichten gelezen zijn of max pogingen bereikt
  useEffect(() => {
    if (!profile || !loaded) return;
    if (!messages.some(m => m.from === 'me' && !m.read && !m.deleted_at)) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 12; // ~36s bij 3s interval
    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const { data } = await supabase
          .from('conversation_reads')
          .select('user_id,last_read_at')
          .eq('conversation_id', chatId);
        if (data && Array.isArray(data)) {
          const peer = data.find(r => r.user_id !== profile.id && r.last_read_at);
          if (peer?.last_read_at) {
            const ts = new Date(peer.last_read_at).getTime();
            setMessages(prev => prev.map(m => m.from === 'me' && !m.read && new Date(m.at).getTime() <= ts ? { ...m, read: true, readAt: peer.last_read_at } : m));
            // stop indien alles gelezen
            if (!messages.some(mm => mm.from === 'me' && !mm.read && !mm.deleted_at)) return;
          }
        }
      } catch { /* ignore */ }
      if (attempts < MAX_ATTEMPTS) setTimeout(poll, 3000);
    };
    poll();
    return () => { cancelled = true; };
  }, [profile, loaded, messages, chatId, supabase]);

  // When opening (transition minimized -> false) clear badge immediately (optimistic) even before markRead completes
  const prevMinRef = useRef(minimized);
  useEffect(() => {
    if (prevMinRef.current && !minimized) {
      // just opened
      if (bubbleUnread > 0) {
        setBubbleUnread(0);
        window.dispatchEvent(new CustomEvent('ocaso:conversation-read', { detail: { id: chatId } }));
      }
      if (messages.length) markRead();
    }
    prevMinRef.current = minimized;
  }, [minimized, bubbleUnread, chatId, messages.length, markRead]);

  // Realtime inserts (messages)
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`dock:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chatId}` }, (payload) => {
        const raw = (payload as unknown as { new: ApiMessage }).new;
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
            console.debug('Realtime binnengekomen', raw);
        }
        setMessages(prev => prev.some(p => p.id === raw.id) ? prev : [...prev, {
          id: raw.id,
          from: raw.sender_id === profile.id ? 'me' : 'them',
          text: raw.body,
          at: raw.created_at,
          edited_at: raw.edited_at,
          deleted_at: raw.deleted_at,
          attachments: [],
          read: raw.sender_id === profile.id ? false : undefined,
        }]);
        // Fetch attachments for this new message (if any)
        (async () => {
          try {
            const { data: atts } = await supabase
              .from('message_attachments')
              .select('id,url,content_type')
              .eq('message_id', raw.id);
            if (atts && atts.length) {
              setMessages(prev => prev.map(m => m.id === raw.id ? { ...m, attachments: atts.map(a => ({ id: a.id, url: a.url, content_type: (a as { content_type?: string | null }).content_type || null })) } : m));
            }
          } catch {/* ignore */}
        })();
        // Increment unread for bubble if minimized and message from them
        if (minimized && raw.sender_id !== profile.id) {
          setBubbleUnread(u => u + 1);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, chatId, profile, minimized]);

  // Realtime read receipts (other participant)
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`reads:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_reads', filter: `conversation_id=eq.${chatId}` }, handleReadRow)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_reads', filter: `conversation_id=eq.${chatId}` }, handleReadRow)
      .subscribe();
    interface ReadRow { user_id: string; last_read_at: string }
    async function handleReadRow(payload: { new: ReadRow }) {
      if (!profile) return;
      const row = payload.new;
      if (!row || !row.last_read_at || row.user_id === profile.id) return;
      const ts = new Date(row.last_read_at).getTime();
  setMessages(prev => prev.map(m => m.from === 'me' && new Date(m.at).getTime() <= ts ? { ...m, read: true, readAt: row.last_read_at } : m));
    }
    return () => { supabase.removeChannel(channel); };
  }, [supabase, chatId, profile]);

  useEffect(() => {
    // autoscroll to bottom on new messages
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t && draftAttachments.length === 0) return;
    // Snapshot draft attachments before clearing so we can fallback if server fails
    const draftSnapshot = [...draftAttachments];
    const attachmentsPayload = draftSnapshot.map(a => ({ url: a.url, content_type: a.content_type }));
    setText("");
    setDraftAttachments([]);
    setSendError(null);
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* ignore */ }
    const r = await fetch(`/api/messages/${chatId}`, { method: 'POST', headers, body: JSON.stringify({ text: t, attachments: attachmentsPayload }) });
    let d: unknown = null;
    try { d = await r.json(); } catch { /* ignore */ }
    const hasMessage = (val: unknown): val is { message: ApiMessage | null } => {
      return typeof val === 'object' && val !== null && 'message' in val;
    };
  if (hasMessage(d)) {
      const m = d.message;
      const attErr = (typeof d === 'object' && d && 'attachments_error' in d) ? (d as { attachments_error?: string | null }).attachments_error : null;
      if (m) {
        // Fallback: if server returned no attachments but we had drafted some and an error occurred, attach them locally (optimistic)
    const serverAtts = m.attachments || [];
    const finalAtts = (serverAtts.length === 0 && draftSnapshot.length > 0 && attErr) ? draftSnapshot : serverAtts;
        setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, { id: m.id, from: 'me', text: m.body, at: m.created_at, edited_at: m.edited_at, deleted_at: m.deleted_at, attachments: finalAtts, read: false }]);
    if (attErr) setSendError(`Bijlagen lokaal toegevoegd (server fout): ${attErr}`);
      }
      markRead();
      // Force reload to catch any missed messages
      load();
    } else if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('Send zonder message object', d);
      if (typeof d === 'object' && d && 'error' in d) {
        const err = (d as { error?: string; hint?: string }).error;
        const hint = (d as { error?: string; hint?: string }).hint;
        setSendError(hint ? `${err}: ${hint}` : err || 'Onbekende fout');
      } else if (!r.ok) {
        setSendError(`HTTP ${r.status}`);
      }
    }
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;
    setUploadError(null);
    const MAX_FILES = 5;
    const MAX_FILE_MB = 15; // per file
    const BLOCKED_EXT = ['exe','dll','bat','sh','cmd'];
    const allowedSpace = MAX_FILES - draftAttachments.length;
    const files = incoming.slice(0, allowedSpace);
    if (!files.length) return;
    setUploading(true);
    setUploadStatus({ processed: 0, total: files.length, failed: [] });
    (async () => {
      // Preflight bucket existence (list root). If missing, show clear guidance and abort.
      try {
        const { error: bucketErr } = await supabase.storage.from(CHAT_BUCKET).list('', { limit: 1 });
        if (bucketErr && /not.*found|does.*not.*exist|bucket/i.test(bucketErr.message)) {
          setUploadError(`Bucket ontbreekt. Maak een publieke bucket "${CHAT_BUCKET}" in Supabase Storage.`);
          setUploading(false);
          setUploadStatus(s => ({ ...s, current: undefined }));
          e.target.value = '';
          return;
        }
      } catch { /* ignore, continue to attempt uploads */ }
      for (const file of files) {
        setUploadStatus(s => ({ ...s, current: file.name }));
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (BLOCKED_EXT.includes(ext)) {
          setUploadStatus(s => ({ ...s, failed: [...s.failed, { name: file.name, reason: 'Bestandstype geblokkeerd' }] }));
          setUploadError('Sommige bestanden zijn geweigerd');
          setUploadStatus(s => ({ ...s, processed: s.processed + 1 }));
          continue;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          setUploadStatus(s => ({ ...s, failed: [...s.failed, { name: file.name, reason: `Te groot (> ${MAX_FILE_MB}MB)` }] }));
          setUploadError('Sommige bestanden zijn geweigerd');
          setUploadStatus(s => ({ ...s, processed: s.processed + 1 }));
          continue;
        }
        try {
          const path = `${chatId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext || 'dat'}`;
          const { data, error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
          if (error) {
            if (/bucket.*not.*found/i.test(error.message)) {
              setUploadStatus(s => ({ ...s, failed: [...s.failed, { name: file.name, reason: 'Bucket ontbreekt' }] }));
              setUploadError(`Bucket ontbreekt. Maak een publieke bucket "${CHAT_BUCKET}" in Supabase Storage.`);
            } else {
              setUploadStatus(s => ({ ...s, failed: [...s.failed, { name: file.name, reason: error.message || 'Upload fout' }] }));
              setUploadError('Upload mislukt voor sommige bestanden');
            }
          } else if (data) {
            const { data: pub } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(data.path);
            if (pub?.publicUrl) {
              setDraftAttachments(prev => [...prev, { url: pub.publicUrl, content_type: file.type || null, name: file.name }]);
            } else {
              setUploadStatus(s => ({ ...s, failed: [...s.failed, { name: file.name, reason: 'Publieke URL ontbreekt' }] }));
              setUploadError('Upload mislukt voor sommige bestanden');
            }
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'Onbekende fout';
            setUploadStatus(s => ({ ...s, failed: [...s.failed, { name: file.name, reason }] }));
            setUploadError('Upload mislukt voor sommige bestanden');
        } finally {
          setUploadStatus(s => ({ ...s, processed: s.processed + 1 }));
        }
      }
      setUploading(false);
      setUploadStatus(s => ({ ...s, current: undefined }));
      e.target.value = '';
    })();
  };

  const removeDraftAttachment = (url: string) => {
    setDraftAttachments(prev => prev.filter(a => a.url !== url));
  };

  const baseWidth = expanded ? 560 : 420; // px
  const messageHeightClass = expanded ? 'h-[460px]' : 'h-80';
  // Special minimized bubble UI
  // Measure width of active (non-minimized) dock once mounted
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!minimized && containerRef.current && onReportWidth) {
      const w = containerRef.current.getBoundingClientRect().width;
      if (w) onReportWidth(w);
    }
  }, [minimized, onReportWidth, baseWidth]);

  if (minimized) {
    const bubbleOffset = 68; // horizontal spacing between minimized bubbles
    return (
      <div
        className="fixed bottom-4 right-4 z-40"
        style={{
          bottom: bottomOffset,
          right: 16 + shiftLeft,
          transform: `translateX(-${bubbleIndex * bubbleOffset}px)`
        }}
      >
        <button
          type="button"
          onClick={() => onMinimize?.(false)}
          aria-label={`Open chat: ${title}`}
          title={title}
          className="relative w-14 h-14 rounded-full bg-primary text-black shadow-lg flex items-center justify-center hover:brightness-95 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-4.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
          </svg>
          {bubbleUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {bubbleUnread > 99 ? '99+' : bubbleUnread}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-40"
      style={{
        width: `${baseWidth}px`,
        bottom: bottomOffset,
        right: 16 + shiftLeft,
        transform: `translateX(-${index * 0}px)` // index no longer used for horizontal stacking of full docks
      }}
    >
      <div className="rounded-2xl shadow-lg border bg-white overflow-hidden flex flex-col"
        style={{ height: expanded ? 600 : 520 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b shrink-0">
          <div className="font-medium truncate pr-2 text-sm flex items-center gap-3">
            {peer && (
              <span className="flex items-center gap-2 min-w-0">
                <Avatar src={peer.avatar_url} name={peer.full_name || 'Gebruiker'} size={24} />
                <span className="truncate max-w-[120px] text-gray-700" title={peer.full_name || 'Gebruiker'}>
                  {peer.full_name || 'Gebruiker'}
                </span>
              </span>
            )}
            <span className="flex items-center gap-2 min-w-0">
              {listingImage && (
                <Image
                  src={listingImage}
                  alt={listingTitle || 'Zoekertje'}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded object-cover border"
                />
              )}
              <span className="truncate max-w-[140px]" title={listingTitle || title}>{listingTitle || title}</span>
            </span>
            {listingId && (
              <a
                href={`/listings/${listingId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline text-blue-600 hover:text-blue-800 whitespace-nowrap"
                title="Open zoekertje"
                onClick={(e) => { e.stopPropagation(); }}
              >Open</a>
            )}
            {/* Optional inline unread badge (future actual unread) */}
            {false && <span className="inline-block bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">3</span>}
          </div>
          <div className="flex items-center gap-1">
            {/* Expand / Collapse size */}
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              aria-label={expanded ? 'Verklein venster' : 'Vergroot venster'}
              title={expanded ? 'Verklein' : 'Vergroot'}
              className="p-1 rounded hover:bg-gray-200 text-gray-600 transition"
            >
              {expanded ? (
                // compress icon
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4" />
                  <polyline points="9 7 9 3 5 3" />
                  <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
                  <polyline points="15 17 15 21 19 21" />
                  <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
                  <polyline points="15 9 21 9 21 3" />
                  <path d="M3 15v4a2 2 0 0 0 2 2h4" />
                  <polyline points="9 15 3 15 3 21" />
                </svg>
              ) : (
                // expand icon
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
            {/* Minimize / Restore */}
            <button
              type="button"
              onClick={() => onMinimize?.(!minimized)}
              aria-label={minimized ? 'Open chat' : 'Minimaliseer chat'}
              title={minimized ? 'Openen' : 'Minimaliseren'}
              className="p-1 rounded hover:bg-gray-200 text-gray-600 transition"
            >
              {minimized ? (
                // restore icon (arrow up square)
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <path d="M12 16V8" />
                  <path d="M9 11l3-3 3 3" />
                </svg>
              ) : (
                // minimize icon (minus)
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluit chat"
              title="Sluiten"
              className="p-1 rounded hover:bg-red-100 text-gray-600 hover:text-red-600 transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        {!minimized && (
          <div
            ref={boxRef}
            className={`${messageHeightClass} overflow-y-auto p-4 space-y-3 bg-white grow`}
          >
            {!loaded && (
              <div className="text-xs text-gray-500 text-center py-6">Laden…</div>
            )}
            {loaded && loadError && (
              <div className="text-xs text-red-600 text-center py-6">{loadError === 'not_found' ? 'Gesprek niet gevonden' : loadError}</div>
            )}
            {messages.map((m) => {
              const own = m.from === 'me';
              return (
              <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {!own && (
                  <Avatar src={peer?.avatar_url || null} name={peer?.full_name || 'Gebruiker'} size={20} />
                )}
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm leading-relaxed space-y-2 ${own ? 'bg-primary text-black rounded-br-sm' : 'bg-gray-100 rounded-bl-sm'}`}>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-1">
                      {m.attachments.map(att => {
                        const isImg = (att.content_type || '').startsWith('image/');
                        const ext = att.name?.split('.').pop() || att.url.split('?')[0].split('#')[0].split('.').pop() || '';
                        return isImg ? (
                          <a key={att.url} href={att.url} target="_blank" rel="noreferrer" className="block group relative">
                            <Image src={att.url} alt={att.name || 'afbeelding'} width={100} height={100} className="w-full h-20 object-cover rounded-lg border border-black/10 group-hover:opacity-90" />
                          </a>
                        ) : (
                          <a key={att.url} href={att.url} target="_blank" rel="noreferrer" className="group flex flex-col items-center justify-center h-20 rounded-lg border border-black/10 bg-white hover:bg-gray-50 text-[10px] px-2 text-center">
                            <div className="w-9 h-9 rounded-md bg-gray-200 flex items-center justify-center font-semibold text-gray-700 group-hover:bg-gray-300 transition">{ext.slice(0,4).toUpperCase()}</div>
                            <span className="line-clamp-2 mt-1 text-gray-600 break-all">{att.name || ext.toUpperCase()}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {m.text && <div className={m.deleted_at ? 'italic text-gray-500' : ''}>{m.deleted_at ? '[verwijderd]' : m.text}</div>}
                  <div className="flex items-center justify-between gap-2 text-[10px] opacity-70">
                    <div className="flex items-center gap-2">
                      <span>{new Date(m.at).toLocaleTimeString()}</span>
                      {m.edited_at && !m.deleted_at && <span>(bewerkt)</span>}
                    </div>
                    {own && !m.deleted_at && (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors"
                        title={m.read ? 'Gelezen' : 'Verstuurd'}
                        aria-label={m.read ? 'Bericht gelezen' : 'Bericht verstuurd'}
                      >
                        {m.read ? (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="20 11 9 22 4 17" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );})}
            {sendError && (
              <div className="text-[10px] text-red-600 text-center py-1 break-words">{sendError}</div>
            )}
            {loaded && !loadError && !messages.length && (
              <div className="text-xs text-gray-500 text-center py-6">
                Geen berichten
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {!minimized && (
          <div className="flex flex-col gap-2 p-3 border-t bg-white shrink-0">
            {draftAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draftAttachments.map(a => {
                  const isImg = (a.content_type || '').startsWith('image/');
                  const ext = a.name?.split('.').pop() || a.url.split('?')[0].split('#')[0].split('.').pop() || '';
                  return (
                    <div key={a.url} className="relative group w-16 h-16">
                      {isImg ? (
                        <Image src={a.url} alt={a.name || 'bijlage'} width={64} height={64} className="w-16 h-16 object-cover rounded border" />
                      ) : (
                        <div className="w-16 h-16 rounded border bg-gray-50 flex flex-col items-center justify-center text-[10px] p-1 text-gray-600">
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center font-semibold text-gray-700">{ext.slice(0,4).toUpperCase()}</div>
                          <span className="truncate w-full">{ext.toUpperCase()}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => removeDraftAttachment(a.url)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center opacity-90 group-hover:opacity-100">×</button>
                    </div>
                  );
                })}
              </div>
            )}
            {(uploading || uploadError || uploadStatus.failed.length > 0) && (
              <div className="-mt-1 space-y-1">
                {uploading && (
                  <div className="text-[10px] text-gray-500">
                    Uploaden: {uploadStatus.processed}/{uploadStatus.total}{uploadStatus.current ? ` – ${uploadStatus.current}` : ''}
                  </div>
                )}
                {uploadError && (
                  <div className="text-[10px] text-red-600">{uploadError}</div>
                )}
                {uploadStatus.failed.length > 0 && (
                  <ul className="max-h-20 overflow-y-auto space-y-0.5 pr-1">
                    {uploadStatus.failed.slice(-5).map(f => (
                      <li key={f.name + f.reason} className="text-[10px] text-red-500 flex items-start gap-1">
                        <span className="font-medium">{f.name}:</span>
                        <span>{f.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                title="Bestand toevoegen"
                disabled={uploading || draftAttachments.length >= 5}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.2-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.48" /></svg>
              </button>
              <input ref={fileInputRef} type="file" multiple hidden onChange={onPickFiles} />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Schrijf een bericht…"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              onClick={send}
              disabled={uploading || (!text.trim() && draftAttachments.length === 0)}
              className="rounded-xl bg-primary text-black px-5 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {uploading ? 'Upload…' : 'Verstuur'}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
