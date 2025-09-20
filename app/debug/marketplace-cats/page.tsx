import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

interface CatRow { id: number; name: string; slug: string; parent_id?: number | null; }

export default async function MarketplaceCatsDebugPage({ searchParams }: { searchParams?: Record<string,string> }) {
  const supabase = supabaseServer();
  const limit = 50;

  // Haal categories + subcategories mapping
  const { data: cats } = await supabase
    .from('categories')
    .select('id,name,slug,parent_id');

  const catIndex = new Map<number, CatRow>();
  const subsByParent = new Map<number, CatRow[]>();
  (cats||[]).forEach(c => {
    catIndex.set(c.id, c as CatRow);
    if (c.parent_id) {
      const arr = subsByParent.get(c.parent_id) || [];
      arr.push(c as CatRow);
      subsByParent.set(c.parent_id, arr);
    }
  });

  // Optioneel filter op category slug of id via query params
  const categoryParam = searchParams?.category;
  const subParam = searchParams?.sub;
  let categoryFilterId: number | undefined;
  let subFilterId: number | undefined;
  const isNum = (v?: string) => !!v && /^\d+$/.test(v);
  if (categoryParam) {
    if (isNum(categoryParam)) categoryFilterId = Number(categoryParam);
    else {
      const found = (cats||[]).find(c => c.slug === categoryParam && !c.parent_id);
      if (found) categoryFilterId = found.id;
    }
  }
  if (subParam) {
    if (isNum(subParam)) subFilterId = Number(subParam);
    else {
      const found = (cats||[]).find(c => c.slug === subParam && c.parent_id);
      if (found) subFilterId = found.id;
    }
  }

  let q = supabase.from('listings')
    .select('id,title,category_id,subcategory_id,categories,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (subFilterId) {
    q = q.or(`subcategory_id.eq.${subFilterId},categories.cs.{${subFilterId}}`);
  } else if (categoryFilterId) {
    // include parent + subs
    const subs = (cats||[]).filter(c => c.parent_id === categoryFilterId).map(c => c.id);
    const orParts: string[] = [`category_id.eq.${categoryFilterId}`, `categories.cs.{${categoryFilterId}}`];
    for (const sid of subs) {
      orParts.push(`subcategory_id.eq.${sid}`);
      orParts.push(`categories.cs.{${sid}}`);
    }
    q = q.or(orParts.join(','));
  }

  const { data: listings, error } = await q;

  const rows = (listings||[]).map(l => {
  const legacy: number[] = Array.isArray(l.categories)
    ? (l.categories as (string|number)[])
      .map(v => (typeof v === 'number' ? v : Number(v)))
      .filter((n: number) => typeof n === 'number' && !isNaN(n))
    : [];
    let resolvedCat = l.category_id || undefined;
    let resolvedSub = l.subcategory_id || undefined;
    if (!resolvedSub) resolvedSub = legacy.find(id => catIndex.get(id)?.parent_id) || undefined;
    if (!resolvedCat) resolvedCat = legacy.find(id => !catIndex.get(id)?.parent_id) || (resolvedSub && catIndex.get(resolvedSub!)?.parent_id) || undefined;
    return {
      id: l.id,
      title: l.title,
      category_id: l.category_id,
      subcategory_id: l.subcategory_id,
      legacy,
      resolvedCat,
      resolvedSub,
      displayCat: resolvedCat ? (catIndex.get(resolvedCat)?.name || '??') : '-',
      displaySub: resolvedSub ? (catIndex.get(resolvedSub)?.name || '??') : '-',
    };
  });

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Marketplace Category Debug</h1>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      <p style={{ fontSize: 12, marginTop: 8 }}>Toon max {limit} nieuwste listings. Gebruik ?category=slug of id en ?sub=slug of id.</p>
      <table style={{ width: '100%', marginTop: 16, fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
            <th style={{ padding: 4 }}>ID</th>
            <th style={{ padding: 4 }}>Title</th>
            <th style={{ padding: 4 }}>category_id</th>
            <th style={{ padding: 4 }}>subcategory_id</th>
            <th style={{ padding: 4 }}>legacy categories[]</th>
            <th style={{ padding: 4 }}>resolvedCat</th>
            <th style={{ padding: 4 }}>resolvedSub</th>
            <th style={{ padding: 4 }}>displayCat</th>
            <th style={{ padding: 4 }}>displaySub</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid #ddd' }}>
              <td style={{ padding: 4 }}>{r.id}</td>
              <td style={{ padding: 4, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
              <td style={{ padding: 4 }}>{r.category_id ?? '-'}</td>
              <td style={{ padding: 4 }}>{r.subcategory_id ?? '-'}</td>
              <td style={{ padding: 4 }}>{r.legacy.join(', ') || '-'}</td>
              <td style={{ padding: 4 }}>{r.resolvedCat ?? '-'}</td>
              <td style={{ padding: 4 }}>{r.resolvedSub ?? '-'}</td>
              <td style={{ padding: 4 }}>{r.displayCat}</td>
              <td style={{ padding: 4 }}>{r.displaySub}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={9} style={{ padding: 12, textAlign: 'center', color: '#666' }}>Geen listings gevonden.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
