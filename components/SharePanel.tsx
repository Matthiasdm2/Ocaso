"use client";
import { useMemo, useState } from "react";

type Props = {
  title: string;
  url?: string; // can be relative; will be made absolute in the browser
  className?: string;
};

function toAbsoluteUrl(input?: string): string {
  if (!input) return typeof window !== 'undefined' ? window.location.href : '';
  if (input.startsWith('http')) return input;
  if (typeof window !== 'undefined') return `${window.location.origin}${input}`;
  return input; // SSR fallback; will be corrected on client mount
}

export default function SharePanel({ title, url, className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const absoluteUrl = useMemo(() => toAbsoluteUrl(url), [url]);

  const encoded = useMemo(() => ({
    url: encodeURIComponent(absoluteUrl || ''),
    title: encodeURIComponent(title || ''),
  }), [absoluteUrl, title]);

  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`,
    twitter: `https://twitter.com/intent/tweet?url=${encoded.url}&text=${encoded.title}`,
    whatsapp: `https://wa.me/?text=${encoded.title}%20${encoded.url}`,
    tiktok: `https://www.tiktok.com/`,
    instagram: `https://www.instagram.com/`,
  } as const;

  const open = (href: string) => {
    if (!href) return;
    if (typeof window !== 'undefined') window.open(href, '_blank', 'width=600,height=500');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // ignore
    }
  };

  return (
    <aside className={`rounded-2xl border bg-white shadow p-4 ${className}`} aria-labelledby="share-title">
      <div className="flex items-center justify-between">
        <h3 id="share-title" className="text-base font-semibold text-gray-800">Deel dit zoekertje</h3>
        {copied && <span className="text-xs text-emerald-700">Gekopieerd</span>}
      </div>
      <p className="mt-1 text-sm text-gray-500">Help je zoekertje sneller verkopen door het te delen.</p>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={absoluteUrl}
            className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700"
          />
          <button onClick={copy} className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">Kopieer</button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        <button onClick={() => open(links.facebook)} className="group flex flex-col items-center gap-1 rounded-lg border bg-white p-2 hover:bg-blue-50">
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <span className="font-bold">f</span>
          </div>
          <span className="text-[10px] text-gray-600">Facebook</span>
        </button>
        <button onClick={() => open(links.twitter)} className="group flex flex-col items-center gap-1 rounded-lg border bg-white p-2 hover:bg-blue-50">
          <div className="h-8 w-8 rounded-full bg-blue-400 text-white flex items-center justify-center">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
          </div>
          <span className="text-[10px] text-gray-600">Twitter</span>
        </button>
        <button onClick={() => open(links.whatsapp)} className="group flex flex-col items-center gap-1 rounded-lg border bg-white p-2 hover:bg-green-50">
          <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
          </div>
          <span className="text-[10px] text-gray-600">WhatsApp</span>
        </button>
        <button onClick={async () => { await copy(); open(links.tiktok); }} className="group flex flex-col items-center gap-1 rounded-lg border bg-white p-2 hover:bg-gray-50">
          <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8.5c-2.7 0-4.9-2.2-4.9-4.9V3h-3.4v12.2c0 1.7-1.4 3.1-3.1 3.1S6.5 16.9 6.5 15.2s1.4-3.1 3.1-3.1c.3 0 .7.1 1 .2V9.1c-.3 0-.6-.1-1-.1-3 0-5.5 2.5-5.5 5.5S6.6 20 9.6 20s5.5-2.5 5.5-5.5V8.8c1.1 1 2.6 1.7 4.2 1.7h.7V8.5H21z"/></svg>
          </div>
          <span className="text-[10px] text-gray-600">TikTok</span>
        </button>
        <button onClick={async () => { await copy(); open(links.instagram); }} className="group flex flex-col items-center gap-1 rounded-lg border bg-white p-2 hover:bg-pink-50">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8.5c-2.7 0-4.9-2.2-4.9-4.9V3h-3.4v12.2c0 1.7-1.4 3.1-3.1 3.1S6.5 16.9 6.5 15.2s1.4-3.1 3.1-3.1c.3 0 .7.1 1 .2V9.1c-.3 0-.6-.1-1-.1-3 0-5.5 2.5-5.5 5.5S6.6 20 9.6 20s5.5-2.5 5.5-5.5V8.8c1.1 1 2.6 1.7 4.2 1.7h.7V8.5H21z"/></svg>
          </div>
          <span className="text-[10px] text-gray-600">Instagram</span>
        </button>
      </div>
    </aside>
  );
}
