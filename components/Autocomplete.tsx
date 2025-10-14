"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = { label: string; value: string; meta?: Record<string, unknown> };

export function Autocomplete(props: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (opt: Option) => void;
  fetchOptions: (query: string) => Promise<Option[]>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  minChars?: number;
  disabled?: boolean;
}) {
  const { value, onChange, onPick, fetchOptions, placeholder, className, inputClassName, minChars = 2, disabled } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const doFetch = useMemo(() => {
    return (q: string) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        if (q.trim().length < minChars) { setOptions([]); setLoading(false); return; }
        setLoading(true);
        try {
          const opts = await fetchOptions(q.trim());
          setOptions(opts);
          setHighlight(0);
          setOpen(true);
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 250);
    };
  }, [fetchOptions, minChars]);

  useEffect(() => {
    doFetch(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pick(opt: Option) {
    onChange(opt.value);
    onPick?.(opt);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[highlight]) pick(options[highlight]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className={"relative " + (className || "")} ref={boxRef}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (options.length) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName || "w-full rounded-xl border border-gray-200 px-3 py-2"}
      />
      {open && (options.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Zoeken…</div>
          )}
          {!loading && options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={(i === highlight ? "bg-gray-100 " : "") + "block w-full text-left px-3 py-2 text-sm"}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
