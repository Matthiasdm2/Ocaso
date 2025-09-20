"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type ImageGalleryProps = {
  images: string[];
  title: string;
  main_photo?: string;
};

export default function ImageGallery({ images, title, main_photo }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  function scrollByCards(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLDivElement>("[data-thumb]");
    const step = card ? card.getBoundingClientRect().width + 12 : 220;
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  }

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
        Geen afbeeldingen
      </div>
    );
  }

  const main = main_photo || images[active] || images[0];

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
        <Image
          src={main}
          alt={title ?? `Foto ${active + 1}`}
          fill
          className="object-cover"
          sizes="100vw"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {images.length > 1 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-2 py-1 shadow"
          >
            ‹
          </button>

          <div
            ref={trackRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
            style={{ scrollbarWidth: "thin" }}
          >
            {images.map((u, i) => (
              <button
                key={`${u}-${i}`}
                type="button"
                data-thumb
                onClick={() => setActive(i)}
                className={`relative w-28 h-20 rounded-lg overflow-hidden border ${active === i ? "ring-2 ring-primary" : ""}`}
                style={{ minWidth: 112, minHeight: 80 }}
              >
                <Image
                  src={u}
                  alt={`thumb ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                  style={{ width: "100%", height: "100%" }}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-2 py-1 shadow"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
