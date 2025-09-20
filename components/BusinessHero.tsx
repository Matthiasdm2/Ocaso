"use client";
import Image from "next/image";
import { useState } from "react";

interface Props {
  name: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
  categories?: string[];
  addressLine?: string;
  ratingSlot?: React.ReactNode;
  responseTimeHours?: number | null;
  actions?: React.ReactNode;
  socialsSlot?: React.ReactNode; // optionele socials links (instagram/facebook/etc.)
}

export default function BusinessHero({ name, bannerUrl, logoUrl, verified, categories = [], addressLine, ratingSlot, responseTimeHours, actions, socialsSlot }: Props) {
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gray-100">
  <div className="relative w-full h-[300px] md:h-[360px] lg:h-[420px] bg-[linear-gradient(120deg,#e5e7eb,#d1d5db)]">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={name + ' banner'}
            fill
            priority
            onLoad={() => setBannerLoaded(true)}
            className={`object-cover transition-opacity duration-500 ${bannerLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {/* Low-res fallback blur (optional future: add blurDataURL prop) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent" />
      </div>
      {/* Content block sits BELOW banner; logo overlaps slightly */}
      <div className="relative px-6 md:px-8 pb-6">
        {/* Top row: socials & actions */}
        {(socialsSlot || actions) && (
          <div className="relative z-20 flex flex-wrap justify-center md:justify-between items-center gap-3 pt-4 pointer-events-auto">
            {socialsSlot && (
              <div className="flex flex-wrap gap-2 items-center relative z-20">
                {socialsSlot}
              </div>
            )}
            {actions && (
              <div className="flex flex-wrap gap-2 relative z-20">
                {actions}
              </div>
            )}
          </div>
        )}
  <div className="relative z-10 -mt-28 md:-mt-40 flex flex-col items-center md:items-start gap-5">
          <div className="relative w-40 h-40 rounded-2xl border-2 border-emerald-500 bg-white shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-emerald-300/40">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name + ' logo'}
              fill
              onLoad={() => setLogoLoaded(true)}
      className={`object-contain p-4 transition-transform duration-500 ${logoLoaded ? 'scale-100' : 'scale-110'} `}
      sizes="144px"
            />
          ) : (
            <span className="text-[10px] tracking-wide text-gray-400">GEEN LOGO</span>
          )}
          {!logoLoaded && logoUrl && <div className="absolute inset-0 animate-pulse bg-gray-100" />}
        </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3 w-full max-w-full">
            <div className="inline-flex flex-col items-center md:items-start" style={{maxWidth:'min(100%, 480px)'}}>
              <h1 className="text-2xl md:text-3xl font-semibold flex flex-wrap items-center justify-center md:justify-start gap-2 text-gray-900 leading-tight">
              {name}
              {verified && <VerifiedBadge />}
              </h1>
              {ratingSlot && (
                <div className="mt-1 flex items-center justify-center md:justify-start gap-2 flex-wrap text-gray-700 text-sm">
                  {ratingSlot}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 text-xs text-gray-600">
              {typeof responseTimeHours === 'number' && (
                <span>Reactietijd ~ {responseTimeHours}u</span>
              )}
              {addressLine && <span>{addressLine}</span>}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                {categories.map(c => (
                  <span key={c} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" className="-ml-0.5">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
      Geverifieerd
    </span>
  );
}
