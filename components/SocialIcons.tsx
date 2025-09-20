"use client";
import type { AnchorHTMLAttributes } from 'react';
import React from 'react';

interface IconButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string;
  children: React.ReactNode;
}

function IconWrapper({ label, children, ...rest }: IconButtonProps) {
  return (
    <a aria-label={label} {...rest} className={"inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 border border-gray-200 hover:bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 " + (rest.className||"") }>
      {children}
    </a>
  );
}

export const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" {...props}>
    <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.35 2 1.87 6.48 1.87 12.07c0 4.91 3.58 8.98 8.26 9.86v-6.98H7.9v-2.88h2.23V9.41c0-2.2 1.31-3.42 3.32-3.42.96 0 1.97.17 1.97.17v2.17h-1.11c-1.1 0-1.44.68-1.44 1.37v1.64h2.45l-.39 2.88h-2.06v6.98c4.68-.88 8.26-4.95 8.26-9.86Z" />
  </svg>
);

export const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <defs>
      <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="30%" stopColor="#DD2A7B" />
        <stop offset="60%" stopColor="#8134AF" />
        <stop offset="100%" stopColor="#515BD4" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#ig)" />
    <circle cx="12" cy="12" r="4.2" fill="#fff" />
    <circle cx="12" cy="12" r="3" fill="url(#ig)" />
    <circle cx="17.3" cy="6.7" r="1.2" fill="#fff" />
  </svg>
);

export const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="#000" d="M13.5 2h2.4c.2 1.9 1.5 3.4 3.6 3.6v2.4c-1.4.1-2.6-.3-3.6-.9v6.7c0 3-2.3 5.5-5.3 5.6-3 .1-5.5-2.3-5.6-5.3-.1-3 2.3-5.5 5.3-5.6.6 0 1.2.1 1.6.3v2.6c-.5-.2-1.2-.3-1.8-.2-1.5.3-2.5 1.7-2.2 3.3.3 1.5 1.7 2.5 3.2 2.2 1.3-.2 2.2-1.3 2.2-2.6V2Z" />
  </svg>
);

export const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M7.5 5.5c1.5 2 1.5 11 0 13M16.5 5.5c-1.5 2-1.5 11 0 13" strokeLinecap="round" />
  </svg>
);

export function SocialIconsRow({ website, facebook, instagram, tiktok, linkedin }: { website?: string|null; facebook?: string|null; instagram?: string|null; tiktok?: string|null; linkedin?: string|null; }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {website && <IconWrapper label="Website" href={website} target="_blank" rel="noopener noreferrer"><GlobeIcon width={18} height={18} /></IconWrapper>}
      {facebook && <IconWrapper label="Facebook" href={facebook} target="_blank" rel="noopener noreferrer"><FacebookIcon width={18} height={18} /></IconWrapper>}
      {instagram && <IconWrapper label="Instagram" href={instagram} target="_blank" rel="noopener noreferrer"><InstagramIcon width={18} height={18} /></IconWrapper>}
      {tiktok && <IconWrapper label="TikTok" href={tiktok} target="_blank" rel="noopener noreferrer"><TikTokIcon width={18} height={18} /></IconWrapper>}
      {linkedin && <IconWrapper label="LinkedIn" href={linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2]"><svg viewBox="0 0 24 24" width={18} height={18} fill="#0A66C2" aria-hidden><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 8h4V23h-4V8Zm7.5 0h3.8v2.1h.1c.5-1 1.8-2.1 3.7-2.1 4 0 4.7 2.6 4.7 6V23h-4v-7c0-1.7 0-3.9-2.4-3.9s-2.7 1.9-2.7 3.8V23h-4V8Z"/></svg></IconWrapper>}
    </div>
  );
}
