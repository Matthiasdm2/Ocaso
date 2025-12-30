"use client";
import { useId } from 'react';

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  id,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
}) {
  const autoId = useId();
  const idToUse = id ?? name ?? `tf-${autoId}`;
  return (
    <label className="block" htmlFor={idToUse}>
      <div className="text-sm text-gray-700 mb-2">{label}</div>
      <input
        id={idToUse}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  id,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  id?: string;
  name?: string;
}) {
  const autoId = useId();
  const idToUse = id ?? name ?? `ta-${autoId}`;
  return (
    <label className="block" htmlFor={idToUse}>
      <div className="text-sm text-gray-700 mb-2">{label}</div>
      <textarea
        id={idToUse}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="flex min-h-[80px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}
