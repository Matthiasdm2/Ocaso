import Link from "next/link";

export default function Pagination({
  baseUrl,
  page,
  totalPages,
}: {
  baseUrl: string;
  page: number;
  totalPages: number;
}) {
  const prev = page > 1 ? page - 1 : 1;
  const next = page < totalPages ? page + 1 : totalPages;
  const pages = Array.from({ length: totalPages })
    .map((_, i) => i + 1)
    .slice(0, 10); // show first 10 for mock

  const link = (p: number) =>
    `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${p}`;

  return (
    <div className="flex items-center justify-between text-sm">
      <Link
        href={link(prev)}
        className={`px-3 py-2 rounded-xl border ${page === 1 ? "pointer-events-none opacity-50" : ""}`}
      >
        Vorige
      </Link>
      <div className="flex gap-1">
        {pages.map((p) => (
          <Link
            key={p}
            href={link(p)}
            className={`px-3 py-2 rounded-xl border ${p === page ? "bg-primary text-black font-medium" : "bg-white"}`}
          >
            {p}
          </Link>
        ))}
        {totalPages > 10 && <span className="px-2">…</span>}
      </div>
      <Link
        href={link(next)}
        className={`px-3 py-2 rounded-xl border ${page === totalPages ? "pointer-events-none opacity-50" : ""}`}
      >
        Volgende
      </Link>
    </div>
  );
}
