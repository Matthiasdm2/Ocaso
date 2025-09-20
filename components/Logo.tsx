import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-primary" />
      <span className="font-semibold tracking-tight">OCASO</span>
    </Link>
  );
}
