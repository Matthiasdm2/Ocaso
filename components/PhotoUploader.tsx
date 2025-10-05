"use client";

import React, { useEffect, useRef, useState } from "react";

type PhotoUploaderProps = {
  onFilesChange?: (files: File[]) => void;
  onUrlsChange?: (urls: string[]) => void;
  uploading?: boolean;
  accept?: string;
  multiple?: boolean;
  /** Max. totaal aantal foto’s (frontend-limiet) */
  maxCount?: number;
  /** Huidig aantal al toegevoegde foto’s */
  currentCount?: number;
};

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onFilesChange,
  onUrlsChange,
  uploading = false,
  accept = "image/*",
  multiple = true,
  maxCount = 12,
  currentCount = 0,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [urlField, setUrlField] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const remaining = Math.max(0, maxCount - currentCount);
  const disabled = uploading || remaining === 0;

  function handlePickClick() {
    if (!disabled) inputRef.current?.click();
  }

  function handleCameraClick() {
    if (!disabled) cameraRef.current?.click();
  }

  function handleCameraInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    let sliced = files;
    if (files.length > remaining) {
      sliced = files.slice(0, remaining);
      alert(
        `Maximaal ${maxCount} foto’s. Je kunt er nu nog ${remaining} toevoegen.`,
      );
    }
    if (sliced.length && onFilesChange) onFilesChange(sliced);
    e.currentTarget.value = ""; // reset
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    let sliced = files;
    if (files.length > remaining) {
      sliced = files.slice(0, remaining);
      alert(
        `Maximaal ${maxCount} foto’s. Je kunt er nu nog ${remaining} toevoegen.`,
      );
    }
    if (sliced.length && onFilesChange) onFilesChange(sliced);
    e.currentTarget.value = ""; // reset
  }

  function handleAddUrl() {
    const trimmed = urlField.trim();
    if (!trimmed) return;
    if (remaining <= 0) {
      alert(`Maximaal ${maxCount} foto’s bereikt.`);
      return;
    }
    try {
      const u = new URL(trimmed);
      if (onUrlsChange) onUrlsChange([u.toString()]);
      setUrlField("");
    } catch {
      alert("Ongeldige URL");
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;

    let sliced = files;
    if (files.length > remaining) {
      sliced = files.slice(0, remaining);
      alert(
        `Maximaal ${maxCount} foto’s. Je kunt er nu nog ${remaining} toevoegen.`,
      );
    }
    if (sliced.length && onFilesChange) onFilesChange(sliced);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={handleCameraInput}
        disabled={disabled}
      />

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`rounded-xl border-2 border-dashed px-4 py-8 text-center ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-50"
        }`}
        onClick={handlePickClick}
        role="button"
        aria-disabled={disabled}
        title={
          disabled ? "Maximum bereikt" : "Klik of sleep je foto’s hierheen"
        }
      >
        <div className="text-sm">
          <div className="font-medium">
            Klik om te kiezen, of sleep je foto’s hierheen
          </div>
          <div className="text-gray-500 mt-1">
            Ondersteund: JPG, PNG, WEBP, HEIC
          </div>
          <div className="text-sm mt-2">
            Nog toe te voegen: <span className="font-medium">{remaining}</span>
          </div>
        </div>
      </div>

      {onUrlsChange && (
        <div className="flex items-center gap-2">
          {isMobile ? (
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={disabled}
              className="flex-1 rounded-xl border px-3 py-2 text-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              📷 Foto nemen
            </button>
          ) : (
            <>
              <input
                type="url"
                value={urlField}
                onChange={(e) => setUrlField(e.target.value)}
                placeholder="https://voorbeeld.be/foto.jpg"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={disabled || !urlField.trim()}
                className="rounded-xl border px-3 py-2 text-sm bg-white disabled:opacity-60"
              >
                URL toevoegen
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
