"use client";
export default function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`w-12 h-7 rounded-full transition ${checked ? "bg-primary" : "bg-gray-300"} relative`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white transition ${checked ? "right-1" : "left-1"}`}
        />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}
