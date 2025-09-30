"use client";
import { useRouter } from "next/navigation";

export default function LoginPrompt({ onClose, message = 'Je moet ingelogd zijn om een review te plaatsen.' }: { onClose: () => void; message?: string }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl">×</button>
        <h3 className="text-lg font-semibold mb-2">Inloggen vereist</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 border text-sm">Annuleren</button>
          <button onClick={() => router.push('/login')} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm">Inloggen</button>
        </div>
      </div>
    </div>
  );
}
