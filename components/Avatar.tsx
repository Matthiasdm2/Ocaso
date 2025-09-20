"use client";

import Image from "next/image";

type Props = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number; // pixels
  rounded?: "full" | "xl"; // circle vs rounded-2xl
  className?: string;
  alt?: string;
};

function initialsFrom(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    const res = `${a}${b}`.toUpperCase();
    if (res.trim()) return res;
  }
  const e = (email || "").trim();
  return (e[0] || "U").toUpperCase();
}

export default function Avatar({ src, name, email, size = 64, rounded = "full", className, alt }: Props) {
  const radiusClass = rounded === "full" ? "rounded-full" : "rounded-2xl";
  const initials = initialsFrom(name, email);
  const dim = { width: size, height: size };
  const cx = (...xs: Array<string | undefined | null | false>) => xs.filter(Boolean).join(" ");

  if (src) {
    return (
      <Image
        src={src}
        alt={alt || name || "Avatar"}
        {...dim}
        className={cx(radiusClass, "object-cover border", className)}
      />
    );
  }

  return (
    <div
      aria-label="Placeholder avatar"
      className={cx(
        radiusClass,
        "grid place-items-center bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-300 text-emerald-900 border",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span className="select-none text-xs font-semibold tracking-wide">
        {initials}
      </span>
    </div>
  );
}
