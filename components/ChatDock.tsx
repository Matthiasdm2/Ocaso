"use client";
import Image from 'next/image';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import { createClient } from '@/lib/supabaseClient';
import { useProfile } from '@/lib/useProfile';
// Chat attachments bucket (must exist as public in Supabase). Override via NEXT_PUBLIC_CHAT_BUCKET
const CHAT_BUCKET = process.env.NEXT_PUBLIC_CHAT_BUCKET || 'chat-attachments';

// Supports both legacy (url/content_type) and new schema (storage_path/mime_type/size_bytes)
type NormalizedAttachment = {
  id?: string;
  url: string; // guaranteed for rendering
  content_type: string | null;
  name?: string;
  storage_path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
};
type Msg = { id: string; from: "me" | "them"; text: string; at: string; edited_at?: string | null; deleted_at?: string | null; attachments?: NormalizedAttachment[]; read?: boolean; readAt?: string | null };
interface ApiMessage { id: string; sender_id: string; body: string; created_at: string; edited_at?: string | null; deleted_at?: string | null; attachments?: unknown[]; read?: boolean }

// Helper function to extract IBAN from attachment name (supports both EPC and universal formats)
const extractIbanFromAttachment = (att: NormalizedAttachment): string | null => {
  const name = att.name || '';
  const match = name.match(/epc-qr_([A-Z]{2}\d{14}|[A-Z]{2}\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{2,4})(?:_[\d.]+EUR)?\.png$/i);
  return match ? match[1].replace(/\s+/g, '') : null;
};

// Helper function to extract amount from EPC attachment name
const extractAmountFromAttachment = (att: NormalizedAttachment): string | null => {
  const name = att.name || '';
  const match = name.match(/epc-qr_[A-Z0-9]+_([\d.]+)EUR\.png$/i);
  return match ? `EUR${match[1]}` : null;
};

// Helper function to determine Belgian bank from IBAN
const getBankFromIban = (iban: string): string | null => {
  if (!iban.startsWith('BE')) return null;
  const code = iban.slice(4, 8); // Belgian IBAN format: BE 2 digits + 10 digits, bank code is positions 5-8
  if (code.startsWith('73')) return 'kbc';
  if (code.startsWith('68')) return 'belfius';
  if (code.startsWith('21') || code.startsWith('25')) return 'bnp'; // BNP and Fortis
  if (code.startsWith('25')) return 'ing'; // ING
  if (code.startsWith('29')) return 'argenta';
  return null;
};

// Helper function to get bank app URL scheme with payment data
const getBankAppScheme = (bank: string, iban: string, amount?: string): string | null => {
  const baseAmount = amount ? amount.replace('EUR', '') : '';
  const message = 'Ocaso%20betaling';
  
  switch (bank) {
    case 'kbc': return `kbc-mobile://pay?iban=${iban}&amount=${baseAmount}&message=${message}`;
    case 'belfius': return `belfius://pay?iban=${iban}&amount=${baseAmount}&message=${message}`;
    case 'bnp': return `bnp://pay?iban=${iban}&amount=${baseAmount}&message=${message}`;
    case 'ing': return `ing://pay?iban=${iban}&amount=${baseAmount}&message=${message}`;
    case 'argenta': return `argenta://pay?iban=${iban}&amount=${baseAmount}&message=${message}`;
    default: return null;
  }
};

// Helper function to open bank app with payment data
const openBankApp = (iban: string, amount?: string) => {
  // First try payto:// URL which some bank apps support
  if (amount) {
    const paytoUrl = `payto://iban/${iban}?amount=${amount.replace('EUR', '')}&currency=EUR&creditor-name=Verkoper&remittance-information=Ocaso%20betaling`;
    try {
      window.location.href = paytoUrl;
      return true;
    } catch (e) {
      // payto not supported, continue to bank app
    }
  }

  // Fallback to bank-specific app scheme
  const bank = getBankFromIban(iban);
  if (!bank) return false;
  const scheme = getBankAppScheme(bank, iban, amount);
  if (!scheme) return false;
  try {
    window.location.href = scheme;
    return true;
  } catch (e) {
    return false;
  }
};

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

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, [text]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [listingImage, setListingImage] = useState<string | null>(null);
  const [bubbleUnread, setBubbleUnread] = useState(0);
  const [draftAttachments, setDraftAttachments] = useState<NormalizedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ current?: string; processed: number; total: number; failed: { name: string; reason: string }[] }>({ processed: 0, total: 0, failed: [] });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const markPending = useRef<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [peer, setPeer] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  // Payment QR local state (seller only)
  const [epcOpen, setEpcOpen] = useState(false);
  const [epcAmount, setEpcAmount] = useState('');
  const [epcDesc, setEpcDesc] = useState('');
  const [epcBusy, setEpcBusy] = useState(false);
  const [epcError, setEpcError] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [myIban, setMyIban] = useState<string>('');
  const [myName, setMyName] = useState<string>('');
  // Phrase used to detect seller acceptance messages (buyer should see pay CTA below)
  const acceptPhrase = 'Uw bod werd aanvaard';
  // legacy message token (kept but prefixed with _ to avoid unused-var lint error)
  const _PAYMENT_TOKEN = '[ocaso:payment-request]';
  // mark as used to satisfy lint rules that disallow assigned-but-unused even if prefixed
  void _PAYMENT_TOKEN;

  // Normalize incoming attachments to always have a usable public URL
  const normalizeAttachments = useCallback((atts: unknown): NormalizedAttachment[] => {
    if (!Array.isArray(atts)) return [];
    const toPublicUrl = (sp?: string | null): string | undefined => {
      if (!sp) return undefined;
      try {
        const { data } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(sp);
        return data?.publicUrl || undefined;
      } catch {
        return undefined;
      }
    };
    return atts.map((a) => {
      const obj = a as Record<string, unknown>;
      const storagePath = typeof obj.storage_path === 'string'
        ? (obj.storage_path as string)
        : (typeof obj.path === 'string' ? (obj.path as string) : null);
      const url: string | undefined = typeof obj.url === 'string' ? (obj.url as string) : toPublicUrl(storagePath);
      const contentType: string | null = typeof obj.content_type === 'string'
        ? (obj.content_type as string)
        : (typeof obj.mime_type === 'string' ? (obj.mime_type as string) : null);
      const name: string | undefined = typeof obj.name === 'string' ? (obj.name as string) : (storagePath ? storagePath.split('/').pop() : undefined);
      const id: string | undefined = typeof obj.id === 'string' ? (obj.id as string) : undefined;
      const mime: string | null = typeof obj.mime_type === 'string' ? (obj.mime_type as string) : null;
      const size: number | null = typeof obj.size_bytes === 'number' ? (obj.size_bytes as number) : null;
      return { id, url: url as string, content_type: contentType, name, storage_path: storagePath, mime_type: mime, size_bytes: size } as NormalizedAttachment;
    }).filter(att => !!att.url) as NormalizedAttachment[];
  }, [supabase]);

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
      // normalize to ensure url is present for rendering
              attachments: normalizeAttachments(m.attachments || []),
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
  }, [chatId, profile, supabase, normalizeAttachments]);

  useEffect(() => { load(); }, [load]);

  // Determine if current user is the seller of the listing
  useEffect(() => {
    if (!profile?.id || !listingId) return;
    (async () => {
      try {
        const { data: listing } = await supabase
          .from('listings')
          .select('id,seller_id,price')
          .eq('id', listingId)
          .maybeSingle();
        if (listing && listing.seller_id === profile.id) setIsSeller(true);
        else setIsSeller(false);
        if (listing && 'price' in listing) {
          const raw = (listing as { price?: unknown }).price as unknown;
          const num = typeof raw === 'number' ? raw : Number(raw || 0);
          const val = Number.isFinite(num) ? num : null;
          if (!epcAmount && val && val > 0) {
            setEpcAmount(val.toFixed(2));
          }
        }
      } catch {
        setIsSeller(false);
      }
    })();
  }, [supabase, profile?.id, listingId, epcAmount]);

  // When opening payment QR panel, ensure we have own bank details
  useEffect(() => {
    if (!epcOpen) return;
    if (myIban && myName) return;
    (async () => {
      try {
        if (!profile?.id) return;
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, bank')
          .eq('id', profile.id)
          .maybeSingle();
        const fullName = (p as { full_name?: string | null })?.full_name || 'Verkoper';
        const bank = (p as { bank?: { iban?: string; bic?: string } | null })?.bank || null;
        setMyName(fullName || 'Verkoper');
        setMyIban((bank?.iban || '').trim());
      } catch { /* ignore */ }
    })();
  }, [epcOpen, supabase, profile?.id, myIban, myName]);

  // Auto-fill description with listing title when opening payment panel
  useEffect(() => {
    if (epcOpen && !epcDesc && listingTitle) {
      setEpcDesc(listingTitle);
    }
  }, [epcOpen, epcDesc, listingTitle]);

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
            let atts: unknown[] | null = null;
            let errMsg: string | null = null;
            const res1 = await supabase
              .from('message_attachments')
              .select('id,url,content_type,storage_path,mime_type,size_bytes')
              .eq('message_id', raw.id);
            if (res1.error) {
              errMsg = res1.error.message;
            } else {
              atts = res1.data as unknown[] | null;
            }
            if ((!atts || !atts.length) && errMsg) {
              const res2 = await supabase
                .from('message_attachments')
                .select('id,url,content_type')
                .eq('message_id', raw.id);
              if (!res2.error) atts = res2.data as unknown[] | null;
            }
            if (atts && atts.length) {
              const normalized = normalizeAttachments(atts);
              setMessages(prev => prev.map(m => m.id === raw.id ? { ...m, attachments: normalized } : m));
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
  }, [supabase, chatId, profile, minimized, normalizeAttachments]);

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
  // Prefer new schema fields; keep url for legacy/server fallback
  const attachmentsPayload = draftSnapshot.map(a => ({
    url: a.url,
    content_type: a.content_type,
    name: a.name,
    storage_path: a.storage_path ?? undefined,
    mime_type: a.mime_type ?? a.content_type ?? undefined,
    size_bytes: typeof a.size_bytes === 'number' ? a.size_bytes : undefined,
  }));
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
    const finalAttsNorm = normalizeAttachments((serverAtts.length === 0 && draftSnapshot.length > 0 && attErr) ? draftSnapshot : serverAtts);
        setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, { id: m.id, from: 'me', text: m.body, at: m.created_at, edited_at: m.edited_at, deleted_at: m.deleted_at, attachments: finalAttsNorm, read: false }]);
    if (attErr) setSendError(`Bijlagen lokaal toegevoegd (server fout): ${attErr}`);
      }
      markRead();
      // Force reload to catch any missed messages
      load();
    } else {
      // Show server-provided error messages to the user (always, not only in dev)
      // d may be undefined if parsing failed
      // eslint-disable-next-line no-console
      console.debug('Send response without message object', d, 'status', r.status);
      if (d && typeof d === 'object' && 'error' in d) {
        const err = (d as { error?: string; detail?: string; hint?: string }).error;
        const detail = (d as { error?: string; detail?: string }).detail;
        const hint = (d as { error?: string; hint?: string }).hint;
        setSendError(detail ? `${err}: ${detail}` : hint ? `${err}: ${hint}` : (err || `Onbekende fout (HTTP ${r.status})`));
      } else if (!r.ok) {
        setSendError(`HTTP ${r.status}`);
      } else {
        setSendError('Onbekende fout bij verzenden');
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
              setDraftAttachments(prev => [...prev, {
                url: pub.publicUrl,
                content_type: file.type || null,
                name: file.name,
                storage_path: data.path,
                mime_type: file.type || null,
                size_bytes: file.size || undefined,
              }]);
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

  // Generate EPC QR code - European standard supported by most bank apps
  const generateEpcQr = async () => {
    setEpcError(null);
    const cleanIban = (myIban || '').replace(/\s+/g, '').toUpperCase();
    const sanitize = (v: string, max = 70) =>
      v
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .slice(0, max);
    if (!cleanIban) {
      setEpcError('Vul eerst je IBAN in bij je profiel.');
      return;
    }
    const amt = parseFloat((epcAmount || '').replace(',', '.'));
    const amountText = isFinite(amt) && amt > 0 ? `€${amt.toFixed(2)}` : 'Bedrag naar keuze';
    const rem = sanitize((epcDesc || listingTitle || `Ocaso ${listingId || ''}`), 35);
    
    // Generate EPC QR code - the European standard that most bank apps support
    // EPC (European Payments Council) is the most widely supported format
    const bic = 'NOBANL2U'; // Default BIC for Dutch banks when not specified
    const epcData = `BCD\n001\n1\nSCT\n${bic}\n${sanitize((myName || 'Verkoper'), 70)}\n${cleanIban}\nEUR${amt > 0 ? amt.toFixed(2) : '0.00'}\n\n${rem}\n\n`;

    console.log('EPC QR data:', epcData);

    const paymentText = epcData;

    // For payment QR codes, the qrcode library expects a string and handles encoding.
    // Our sanitize function already strips diacritics and non-ASCII chars.
    setEpcBusy(true);
    try {
      const dataUrl = await QRCode.toDataURL(paymentText, { errorCorrectionLevel: 'M', scale: 8, margin: 4, color: { dark: '#000000', light: '#FFFFFF' } });
      // Convert to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      // Some storage backends / client versions behave better when given a File with a name
      // instead of a raw Blob. Create a File wrapper and try uploading that first.
      const fileName = `epc-qr_${cleanIban}${amountText !== 'Bedrag naar keuze' ? `_${amt.toFixed(2)}EUR` : ''}.png`;
  const fileToUpload: Blob | File = new File([blob], fileName, { type: 'image/png' });
  const path = `${chatId}/${fileName}`;
  let uploadResult: { data?: { path?: string } | null; error?: { message?: string } | null } | null = null;
      try {
        uploadResult = await supabase.storage.from(CHAT_BUCKET).upload(path, fileToUpload, { contentType: 'image/png', upsert: false });
      } catch (uploadException) {
        // Capture richer debug info and rethrow as Error so UI shows helpful message
        const errMsg = uploadException instanceof Error ? uploadException.message : JSON.stringify(uploadException);
        throw new Error(`Upload failed: ${errMsg} (blob-size=${(blob as Blob).size}, blob-type=${(blob as Blob).type})`);
      }
      const { data, error } = uploadResult || {};
      if (error) {
        // Try one more time with raw blob as fallback before failing
        try {
          const fallback = await supabase.storage.from(CHAT_BUCKET).upload(path, blob, { contentType: 'image/png', upsert: false });
          if (fallback.error) throw fallback.error;
          const { data: pub } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(fallback.data.path);
          const publicUrl = pub?.publicUrl;
          if (!publicUrl) throw new Error('Public URL ontbreekt');
          // success via fallback
          setDraftAttachments(prev => [...prev, {
            url: publicUrl,
            content_type: 'image/png',
            name: fileName,
            storage_path: fallback.data.path,
            mime_type: 'image/png',
            size_bytes: (blob as Blob).size,
          }]);
          setEpcOpen(false);
          setEpcAmount('');
          setEpcDesc('');
          setEpcBusy(false);
          return;
        } catch (fbErr) {
          const msg = fbErr instanceof Error ? fbErr.message : JSON.stringify(fbErr);
          throw new Error(`Upload failed: ${msg} (initial error: ${error?.message || JSON.stringify(error)})`);
        }
      }
      const uploadedPath = data?.path;
      const { data: pub } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(uploadedPath || '');
      const publicUrl = pub?.publicUrl;
      if (!publicUrl || !uploadedPath) throw new Error('Public URL ontbreekt');
      setDraftAttachments(prev => [...prev, {
        url: publicUrl,
        content_type: 'image/png',
        name: fileName,
        storage_path: uploadedPath,
        mime_type: 'image/png',
        size_bytes: (blob as Blob).size,
      }]);
      setEpcOpen(false);
      setEpcAmount('');
      setEpcDesc('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'QR genereren mislukt';
      setEpcError(msg);
    } finally {
      setEpcBusy(false);
    }
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

  // Handle click on payment-request button (buyer flow). This triggers the checkout endpoint and
  // redirects the user to the payment provider (Stripe) when ready. Keep minimal so Stripe integration
  // can be wired later server-side.
  const handlePaymentRequest = async (messageId?: string) => {
    if (!listingId) { alert('Ontbrekend zoekertje'); return; }
    try {
      setPayBusy(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { window.location.href = '/login'; return; }

      // Default shipping mode: pickup. Adjust later if you want to support shipping data here.
      const payload = { listingId, shipping: { mode: 'pickup' as const }, messageId: messageId || null };
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) {
        const txt = await res.text().catch(() => 'Checkout mislukt');
        throw new Error(txt || 'Checkout mislukt');
      }
      const d = await res.json().catch(() => null);
      if (d && d.url) {
        window.location.href = d.url;
        return;
      }
      // If server doesn't return direct url, dispatch event so host app can handle Stripe flow
      try { window.dispatchEvent(new CustomEvent('ocaso:payment-requested', { detail: { listingId, messageId } })); } catch { /* noop */ }
      alert('Betaling gestart. Volg de instructies op de volgende pagina.');
    } catch (e) {
      alert((e as Error)?.message || 'Kan betaalpagina niet openen');
    } finally {
      setPayBusy(false);
    }
  };

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
                className="text-sm underline text-blue-600 hover:text-blue-800 whitespace-nowrap"
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
            {/* Seller CTA banner when buyer requested a payment */}
            {isSeller && loaded && !loadError && messages.length > 0 && (() => {
              const lastIncoming = [...messages].reverse().find(m => m.from === 'them' && !!m.text);
              // legacy token removed; detection now uses the acceptance phrase
              const cleanMsgShip = 'De koper vraagt een betaalverzoek';
              const cleanMsgPickup = 'De koper vraagt een betaalverzoek (afhalen)';
              const txt = lastIncoming?.text || '';
              // Toon de betaalverzoek-knop altijd, ongeacht verzending of afhalen
              if (lastIncoming && typeof txt === 'string' && (txt.includes(acceptPhrase) || txt.trim() === cleanMsgShip || txt.trim() === cleanMsgPickup)) {
                return (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M5 8l7-7 7 7" /></svg>
                      <span>De koper vraagt om een betaalverzoek te sturen.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEpcOpen(true)}
                      className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-emerald-700"
                    >genereer betaalverzoek</button>
                  </div>
                );
              }
              return null;
            })()}
            {!loaded && (
              <div className="text-sm text-gray-500 text-center py-6">Laden…</div>
            )}
            {loaded && loadError && (
              <div className="text-sm text-red-600 text-center py-6">{loadError === 'not_found' ? 'Gesprek niet gevonden' : loadError}</div>
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
                    <>
                      {/* Payment QR codes apart weergeven met volledige breedte */}
                      {m.attachments
                        .filter(att => {
                          const iban = extractIbanFromAttachment(att);
                          return iban !== null;
                        })
                        .map(att => {
                          const url = att.url || '';
                          const iban = extractIbanFromAttachment(att);
                          const amount = extractAmountFromAttachment(att);
                          return (
                            <div key={url} className="block group relative mb-2">
                              <div className="text-center mb-2">
                                <div className="text-sm font-medium text-gray-800">
                                  Scan en betaal
                                </div>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => {
                                    if (iban && openBankApp(iban, amount || undefined)) {
                                      // Bank app opened successfully
                                    } else {
                                      // Fallback: open image in new tab
                                      window.open(url, '_blank');
                                    }
                                  }}
                                  className="group-hover:opacity-90"
                                >
                                  <Image src={url} alt={att.name || 'QR code'} width={120} height={120} className="w-30 h-30 object-cover rounded-lg border border-black/10" />
                                </button>
                              </div>
                              <div className="mt-2 text-center space-y-1">
                                <div className="text-[9px] text-gray-500">
                                  Europese betalingsstandaard - werkt met de meeste bankapps
                                </div>
                                <div className="text-[10px] font-medium text-gray-700">
                                  Alternatief: {iban}{amount ? ` - ${amount?.replace('EUR', 'EUR ').replace('.', ',')}` : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {/* Andere attachments in grid */}
                      {m.attachments.filter(att => {
                        const iban = extractIbanFromAttachment(att);
                        return iban === null;
                      }).length > 0 && (
                        <div className="grid grid-cols-3 gap-1">
                          {m.attachments
                            .filter(att => {
                              const iban = extractIbanFromAttachment(att);
                              return iban === null;
                            })
                            .map(att => {
                              const url = att.url || '';
                              const isImg = (att.content_type || '').startsWith('image/');
                              const ext = att.name?.split('.').pop() || url.split('?')[0].split('#')[0].split('.').pop() || '';
                              return isImg ? (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="block group relative">
                                  <Image src={url} alt={att.name || 'afbeelding'} width={100} height={100} className="w-full h-20 object-cover rounded-lg border border-black/10 group-hover:opacity-90" />
                                </a>
                              ) : (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="group flex flex-col items-center justify-center h-20 rounded-lg border border-black/10 bg-white hover:bg-gray-50 text-[10px] px-2 text-center">
                                  <div className="w-9 h-9 rounded-md bg-gray-200 flex items-center justify-center font-semibold text-gray-700 group-hover:bg-gray-300 transition">{ext.slice(0,4).toUpperCase()}</div>
                                  <span className="line-clamp-2 mt-1 text-gray-600 break-all">{att.name || ext.toUpperCase()}</span>
                                </a>
                              );
                            })}
                        </div>
                      )}
                    </>
                  )}
                  {m.text && <div className={m.deleted_at ? 'italic text-gray-500' : ''}>{m.deleted_at ? '[verwijderd]' : m.text}</div>}
                  {/* Payment actions: always render after the text so buttons appear at the bottom of the message */}
                  {/* Show explicit pay CTA only for acceptance messages; do NOT show for 'scan en betaal' text */}
                  {(!own && m.text && typeof m.text === 'string' && m.text.includes(acceptPhrase)) && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={async () => { await handlePaymentRequest(m.id); }}
                        className="mt-1 rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-semibold hover:bg-emerald-700"
                        disabled={payBusy}
                      >{payBusy ? 'Even geduld…' : 'Betaal'}</button>
                    </div>
                  )}
                  {/* EPC 'betaald' action: show for EPC PNG attachments (only for delivery, not pickup) */}
                  {!own && m.attachments && m.attachments.some(a => {
                    const ct = (a.content_type || a.mime_type || '').toLowerCase();
                    const name = (a.name || '').toLowerCase();
                    const sp = (a.storage_path || '').toLowerCase();
                    const isPng = ct === 'image/png' || (name.endsWith('.png') || sp.endsWith('.png'));
                    const mentionsEpc = name.includes('epc') || sp.includes('epc');
                    const isPickup = m.text && m.text.includes('afhalen');
                    return isPng && mentionsEpc && !isPickup;
                  }) && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.access_token) headers.Authorization = `Bearer ${session?.access_token}`;
                            await fetch('/api/payments/qr/paid', { method: 'POST', headers, body: JSON.stringify({ conversationId: chatId, messageId: m.id }) });
                            const optimistic = { id: `${m.id}-paid-${Date.now()}`, from: 'me' as const, text: 'Betaald — label werd aangevraagd.', at: new Date().toISOString(), edited_at: null, deleted_at: null, attachments: [] as NormalizedAttachment[], read: false };
                            setMessages(prev => [...prev, optimistic]);
                          } catch { /* ignore */ }
                        }}
                        className="mt-1 rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-semibold hover:bg-emerald-700"
                      >Markeer als betaald</button>
                    </div>
                  )}
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
              <div className="text-sm text-gray-500 text-center py-6">
                Geen berichten
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {!minimized && (
          <div className="flex flex-col gap-2 p-3 border-t bg-white shrink-0">
            {listingId && (
              <div className="-mt-1">
                <button
                  type="button"
                  onClick={() => setEpcOpen(o => !o)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary text-black px-3 py-1.5 text-sm font-semibold border border-primary/30 hover:bg-primary/80 transition focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {epcOpen ? 'Verberg betaalverzoek' : 'Betaalverzoek toevoegen'}
                </button>
                {epcOpen && (
                  <div className="mt-2 rounded-lg border p-2 bg-emerald-50/40">
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <label className="block text-[11px] text-neutral-600 mb-1">Bedrag (optioneel)</label>
                        <input
                          type="text"
                          value={epcAmount}
                          onChange={(e) => setEpcAmount(e.target.value)}
                          placeholder="bv. 25,00"
                          className="w-full rounded border px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] text-neutral-600 mb-1">Omschrijving (max 35 tekens)</label>
                        <input
                          type="text"
                          value={epcDesc}
                          onChange={(e) => setEpcDesc(e.target.value)}
                          placeholder={listingTitle ? `bv. ${listingTitle.slice(0, 20)}` : "bv. Ocaso betaling"}
                          className="w-full rounded border px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateEpcQr}
                        disabled={epcBusy}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                      >{epcBusy ? 'Bezig…' : 'Genereer & voeg toe'}</button>
                      {epcError && <span className="text-[11px] text-red-600">{epcError}</span>}
                    </div>
                    {!myIban && <div className="mt-1 text-[11px] text-neutral-500">Vul je IBAN in via Profiel → Facturatie & verzending.</div>}
                  </div>
                )}
              </div>
            )}
            {draftAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draftAttachments.map(a => {
                  const isImg = (a.content_type || '').startsWith('image/');
                  const url = a.url || '';
                  const ext = a.name?.split('.').pop() || url.split('?')[0].split('#')[0].split('.').pop() || '';
                  const iban = extractIbanFromAttachment(a);
                  const hasPaymentInfo = iban !== null;
                  return (
                    <div key={url} className="relative group">
                      <div className="w-16 h-16">
                        {isImg ? (
                          <Image src={url} alt={a.name || 'bijlage'} width={64} height={64} className="w-16 h-16 object-cover rounded border" />
                        ) : (
                          <div className="w-16 h-16 rounded border bg-gray-50 flex flex-col items-center justify-center text-[10px] p-1 text-gray-600">
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center font-semibold text-gray-700">{ext.slice(0,4).toUpperCase()}</div>
                            <span className="truncate w-full">{ext.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      {hasPaymentInfo && (
                        <>
                          <div className="mt-1 text-[8px] text-center text-gray-500 w-full">
                            EPC QR code
                          </div>
                          <div className="mt-0.5 text-[9px] text-center font-medium text-gray-700 w-full">
                            Alternatief: {iban}
                          </div>
                        </>
                      )}
                      <button type="button" onClick={() => removeDraftAttachment(url)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center opacity-90 group-hover:opacity-100">×</button>
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
            <div className="flex items-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sm:p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                title="Bestand toevoegen"
                disabled={uploading || draftAttachments.length >= 5}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.2-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.48" /></svg>
              </button>
              <input ref={fileInputRef} type="file" multiple hidden onChange={onPickFiles} />
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Schrijf een bericht…"
              rows={1}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none overflow-hidden min-h-[36px] max-h-32"
            />
            <button
              onClick={send}
              disabled={uploading || (!text.trim() && draftAttachments.length === 0)}
              className="rounded-xl bg-primary text-black px-4 py-2 sm:px-5 sm:py-2 text-sm font-semibold disabled:opacity-50 shrink-0"
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
