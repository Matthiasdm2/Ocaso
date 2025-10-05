"use client";
import Image from "next/image";
import { useState } from "react";

export default function ListingImageSlider({ images, title, link }: { images: string[]; title: string; link: string }) {
  const [active, setActive] = useState(0);
  const imgs = images && images.length > 0 ? images : ["/placeholder.png"];
  const prev = () => setActive((a) => (a === 0 ? imgs.length - 1 : a - 1));
  const next = () => setActive((a) => (a === imgs.length - 1 ? 0 : a + 1));

  return (
    <div className="relative w-full aspect-[4/3] md:w-48 md:h-48 md:aspect-auto flex items-center justify-center">
      <a href={link} className="block w-full h-full relative">
        <Image
          src={imgs[active]}
          alt={title}
          fill
          className="rounded-xl object-cover border bg-white hover:scale-[1.02] transition"
          sizes="(max-width: 768px) 100vw, 192px"
        />
      </a>
      {imgs.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-primary/80 hover:text-white"
            aria-label="Vorige foto"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-primary/80 hover:text-white"
            aria-label="Volgende foto"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>
      )}
      {imgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {imgs.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i === active ? "bg-primary" : "bg-gray-300"} inline-block`} />
          ))}
        </div>
      )}
    </div>
  );
}
