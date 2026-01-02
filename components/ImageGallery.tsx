"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type ImageGalleryProps = {
  images: string[];
  title: string;
  main_photo?: string;
};

export default function ImageGallery({ images, title, main_photo }: ImageGalleryProps) {
  // Initialize active index based on main_photo if provided
  const getInitialActiveIndex = () => {
    if (main_photo && images.includes(main_photo)) {
      return images.indexOf(main_photo);
    }
    return 0;
  };

  const [active, setActive] = useState(getInitialActiveIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          setLightboxOpen(false);
          break;
        case "ArrowLeft":
          setActive(prev => (prev > 0 ? prev - 1 : images.length - 1));
          break;
        case "ArrowRight":
          setActive(prev => (prev < images.length - 1 ? prev + 1 : 0));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, images.length]);

  function scrollByCards(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;

    // Calculate the width of one thumbnail including gap
    const thumbnailWidth = 112; // minWidth from style
    const gap = 12; // gap-3 = 12px
    const step = thumbnailWidth + gap;

    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  }

  function openLightbox() {
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/3] w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
        Geen afbeeldingen
      </div>
    );
  }

  const main = images[active] || images[0];

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden bg-gray-100 cursor-pointer" onClick={openLightbox}>
        <Image
          src={main}
          alt={title ?? `Foto ${active + 1}`}
          fill
          className="object-cover"
          sizes="100vw"
          style={{ width: "100%", height: "100%" }}
          unoptimized
        />
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      </div>

      {images.length > 1 && (
        <div className="relative">
          {/* Scroll buttons - always visible when there are multiple images */}
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-2 py-1 shadow hover:bg-white transition-colors"
            aria-label="Scroll thumbnails left"
          >
            ‹
          </button>

          <div
            ref={trackRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 mx-8"
            style={{ scrollbarWidth: "thin", scrollBehavior: "smooth" }}
          >
            {images.map((u, i) => (
              <button
                key={`${u}-${i}`}
                type="button"
                data-thumb
                onClick={() => setActive(i)}
                className={`relative w-28 h-20 rounded-lg overflow-hidden border transition-all ${
                  active === i ? "ring-2 ring-emerald-500 border-emerald-300" : "border-gray-200 hover:border-gray-300"
                }`}
                style={{ minWidth: 112, minHeight: 80 }}
                aria-label={`View image ${i + 1}`}
              >
                <Image
                  src={u}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                  style={{ width: "100%", height: "100%" }}
                  unoptimized
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-2 py-1 shadow hover:bg-white transition-colors"
            aria-label="Scroll thumbnails right"
          >
            ›
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={closeLightbox}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActive(prev => (prev > 0 ? prev - 1 : images.length - 1)); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActive(prev => (prev < images.length - 1 ? prev + 1 : 0)); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Main image */}
            <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
              <Image
                src={main}
                alt={title ?? `Foto ${active + 1}`}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain"
                style={{ width: "auto", height: "auto" }}
                unoptimized
              />
            </div>

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {active + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
