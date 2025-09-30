"use client";
import React, { useId } from 'react';

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
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        id={idToUse}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-3 py-2"
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
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <textarea
        id={idToUse}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-gray-200 px-3 py-2"
      />
    </label>
  );
}
