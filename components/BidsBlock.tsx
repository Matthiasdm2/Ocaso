"use client";

interface Bid {
  amount: number;
  created_at?: string;
}

interface Props {
  bids: Bid[];
}

export default function BidsBlock({ bids }: Props) {
  // DEBUG: log biedingen in de client console
  // eslint-disable-next-line no-console
  console.log('Client: biedingen ontvangen', bids);
  return (
    <div className="border rounded-lg bg-gray-50 p-4 mb-4">
      <h4 className="text-base font-bold text-emerald-700 mb-2">Biedingen</h4>
      {bids && bids.length > 0 ? (
        <ul className="space-y-2">
          {bids.map((bid, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-gray-800">
              <span className="font-semibold text-emerald-700">€ {bid.amount}</span>
              <span className="text-xs text-gray-500">{bid.created_at ? new Date(bid.created_at).toLocaleString("nl-BE") : ""}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
