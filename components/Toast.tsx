"use client";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type ToastMsg = { id: number; text: string };
const ToastCtx = createContext<{ push: (t: string) => void }>({
  push: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const push = useCallback((text: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-black text-white px-4 py-2 rounded-xl shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
