
"use client";
type Listing = { id: string; title?: string; is_sold?: boolean; sold_via_ocaso?: boolean };
export default function ListingsPanel({ listings, onToggleSold, onChangeViaOcaso }:{ listings: Listing[]; onToggleSold: (id:string, sold:boolean)=>void; onChangeViaOcaso: (id:string, via:boolean)=>void; }){
  return (
    <div className="space-y-3">
      <div className="font-medium">Mijn zoekertjes <span className="text-sm text-neutral-500">({listings?.length || 0})</span></div>
      {!listings?.length ? (
        <div className="text-sm text-neutral-600">Nog geen zoekertjes.</div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {listings.map((l)=> (
            <li key={l.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <div className="truncate pr-4">{l.title || l.id}</div>
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!l.is_sold} onChange={(e)=>onToggleSold(l.id, e.target.checked)} />
                  verkocht
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!l.sold_via_ocaso} onChange={(e)=>onChangeViaOcaso(l.id, e.target.checked)} />
                  via Ocaso
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
