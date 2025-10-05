"use client";

import { useConsent } from '@/lib/useConsent';

export function ConsentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setAll, update } = useConsent();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-base font-semibold">Cookievoorkeuren</h3>
          <button onClick={onClose} className="rounded-md border px-2 py-1 text-sm hover:bg-neutral-50">✕</button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-auto p-5 text-sm">
          <ConsentRow label="Essentieel" desc="Altijd actief voor beveiliging en basisfunctionaliteit." locked checked />
          <ConsentRow label="Functioneel" desc="Onthoudt instellingen en voorkeuren." checked={prefs.functional} onChange={(v)=> update({ functional: v })} />
          <ConsentRow label="Analytisch" desc="Helpt ons prestaties te meten (geanonimiseerd)." checked={prefs.analytics} onChange={(v)=> update({ analytics: v })} />
          <ConsentRow label="Marketing" desc="Personalisatie & campagnes." checked={prefs.marketing} onChange={(v)=> update({ marketing: v })} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setAll({ functional: true, analytics: false, marketing: false }); onClose(); }}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >Alleen essentieel</button>
            <button
              onClick={() => { setAll({ functional: true, analytics: true, marketing: false }); onClose(); }}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >Essentieel + analytisch</button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setAll({ functional: true, analytics: true, marketing: true }); onClose(); }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
            >Alles accepteren</button>
            <button
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >Sluiten</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({ label, desc, locked, checked, onChange }: { label: string; desc: string; locked?: boolean; checked?: boolean; onChange?: (v:boolean)=>void }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {locked && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">vast</span>}
        </div>
        <p className="mt-1 text-sm text-neutral-600 leading-snug">{desc}</p>
      </div>
      {!locked && (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={!!checked} onChange={(e)=> onChange?.(e.target.checked)} />
        </label>
      )}
      {locked && <input type="checkbox" className="h-4 w-4" checked disabled />}
    </div>
  );
}