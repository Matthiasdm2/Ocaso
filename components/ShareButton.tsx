"use client";
import { useCallback, useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const onShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title, url }).catch(()=>{});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(()=>{
        setCopied(true);
        setTimeout(()=> setCopied(false), 1800);
      }).catch(()=>{});
    }
  }, [title]);
  return (
    <button aria-label={copied ? 'Gekopieerd' : 'Deel'} onClick={onShare} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 border border-gray-200 hover:bg-white shadow-sm transition relative">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="block"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.7 11.1l6.6-3.2M15.3 16.1l-6.6-3.2" strokeLinecap="round"/></svg>
      {copied && <span className="absolute -bottom-6 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">✔</span>}
    </button>
  );
}
