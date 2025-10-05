export default function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
