"use client";

import Image from "next/image";
import React from "react";

interface Props {
  imageUrls: string[];
  mainIndex: number;
  markAsMain: (i: number) => void;
  onDragStart?: (i: number) => void;
  onDragOver?: (e: React.DragEvent, i: number) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent, i: number) => void;
  draggedIndex?: number | null;
  dragOverIndex?: number | null;
  scrollByCards?: (dir: "left" | "right") => void;
  trackRef?: React.RefObject<HTMLDivElement>;
  onRemove?: (i: number) => void;
}

export default function ImagePreviewSlider({
  imageUrls,
  mainIndex,
  markAsMain,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  draggedIndex,
  dragOverIndex,
  scrollByCards,
  trackRef,
  onRemove,
}: Props) {
  if (!imageUrls || imageUrls.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {imageUrls.length} foto{imageUrls.length > 1 ? "’s" : ""} — kies hoofdafbeelding
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByCards?.("left")}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByCards?.("right")}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto no-scrollbar py-2"
        aria-hidden={false}
      >
        {imageUrls.map((url, i) => (
          <div
            key={i}
            data-thumb
            role="button"
            tabIndex={0}
            onClick={() => markAsMain(i)}
            onPointerDown={() => onDragStart?.(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") markAsMain(i);
            }}
            draggable
            onDragStart={(e) => {
              onDragStart?.(i);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => onDragOver?.(e, i)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop?.(e, i)}
            className={`flex-shrink-0 w-36 h-28 rounded-xl overflow-hidden border ${
              i === mainIndex ? "ring-2 ring-emerald-500 border-emerald-200" : "border-gray-200"
            } ${i === draggedIndex ? "opacity-50" : ""} ${i === dragOverIndex ? "ring-2 ring-blue-500" : ""} relative cursor-pointer`}
            title={i === mainIndex ? "Hoofdafbeelding" : `Zet als hoofdafbeelding (${i + 1})`}
          >
            <Image
              src={url}
              alt={`Foto ${i + 1}`}
              width={320}
              height={240}
              className="object-cover w-full h-full"
              unoptimized
            />

            <div className="absolute top-1 right-1 flex gap-1">
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                  className="bg-white/80 rounded-full p-1 text-sm hover:bg-white"
                  aria-label={`Verwijder foto ${i + 1}`}
                >
                  ✕
                </button>
              )}
              {i === mainIndex && (
                <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full mr-1">
                  Hoofd
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    );
  }