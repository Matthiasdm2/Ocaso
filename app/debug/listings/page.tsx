import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

export default async function ListingsDebugPage() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,price,seller_id,created_at,status")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return <pre>Fout: {error.message}</pre>;
  if (!data?.length) return <p>Geen listings gevonden.</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Listings (debug)</h1>
      <ul>
  {(data as { id: number; title: string; price: number | null; created_at?: string | null; status?: string | null }[]).map((l) => (
          <li key={l.id}>
            <strong>{l.title}</strong> — €{l.price} — Status: <em>{l.status || 'geen'}</em>{" "}
            <small>({new Date(l.created_at!).toLocaleString()})</small>
          </li>
        ))}
      </ul>
    </main>
  );
}
