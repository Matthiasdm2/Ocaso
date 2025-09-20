"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 1) Als de reset-link je hierheen stuurt, staan tokens in de URL hash (#access_token=...)
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const qs = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = qs.get("access_token");
    const refresh_token = qs.get("refresh_token");

    const init = async () => {
      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } finally {
        setSessionReady(true);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!password || password.length < 8) {
      return setErr("Wachtwoord moet minstens 8 tekens zijn.");
    }
    if (password !== confirm) {
      return setErr("Wachtwoorden komen niet overeen.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk("Wachtwoord aangepast ✅ Je kan nu inloggen.");
      // optioneel: automatisch doorsturen
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Kon wachtwoord niet aanpassen.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-10 flex justify-center">
      <form onSubmit={onSubmit} className="card p-6 w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Nieuw wachtwoord</h1>

        {!sessionReady && (
          <p className="text-sm text-gray-500">Bezig met beveiligen…</p>
        )}

        {sessionReady && (
          <>
            <input
              type="password"
              placeholder="Nieuw wachtwoord (min. 8 tekens)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2"
              minLength={8}
              required
            />
            <input
              type="password"
              placeholder="Bevestig nieuw wachtwoord"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2"
              minLength={8}
              required
            />
            <button
              className="w-full rounded-xl bg-primary text-black px-4 py-2 font-medium disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Bezig…" : "Wachtwoord opslaan"}
            </button>
          </>
        )}

        {ok && <p className="text-green-600 text-sm">{ok}</p>}
        {err && <p className="text-red-500 text-sm">{err}</p>}

        <p className="text-xs text-gray-500">
          Tip: open deze pagina via de link in je reset-mail. Heb je geen mail?
          Ga terug naar{" "}
          <a href="/login" className="underline">
            Inloggen
          </a>{" "}
          en kies <em>Wachtwoord vergeten</em>.
        </p>
      </form>
    </div>
  );
}
