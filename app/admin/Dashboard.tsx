"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Stats = {
  visitors: number;
  listings: number;
  sales: number;
  shipments: number;
};

type CategoryStats = {
  name: string;
  count: number;
  subcategories: { name: string; count: number }[];
};

type DailyVisitor = {
  date: string;
  visitors: number;
  day: string;
};

type DailyListing = {
  date: string;
  listings: number;
  day: string;
};

type DailyUser = {
  date: string;
  users: number;
  day: string;
};

type Period = "7d" | "31d" | "1y" | "all";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ visitors: 0, listings: 0, sales: 0, shipments: 0 });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [dailyVisitors, setDailyVisitors] = useState<DailyVisitor[]>([]);
  const [dailyListings, setDailyListings] = useState<DailyListing[]>([]);
  const [dailyUsers, setDailyUsers] = useState<DailyUser[]>([]);
  const [period, setPeriod] = useState<Period>("31d");
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const [statsRes, categoryRes, visitorsRes, listingsRes, usersRes] = await Promise.all([
      fetch(`/api/admin/stats?period=${period}`),
      fetch(`/api/admin/category-stats?period=all`), // Altijd alle categorieën tonen
      fetch(`/api/admin/daily-visitors?period=${period}`),
      fetch(`/api/admin/daily-listings?period=${period}`),
      fetch(`/api/admin/daily-users?period=${period}`)
    ]);

    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats(data);
    }

    if (categoryRes.ok) {
      const data = await categoryRes.json();
      setCategoryStats(data);
    }

    if (visitorsRes.ok) {
      const data = await visitorsRes.json();
      setDailyVisitors(data);
    }

    if (listingsRes.ok) {
      const data = await listingsRes.json();
      setDailyListings(data);
    }

    if (usersRes.ok) {
      const data = await usersRes.json();
      setDailyUsers(data);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <div>Laden...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>

      {/* Periode selectie */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Periode</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="border p-2"
        >
          <option value="7d">Laatste 7 dagen</option>
          <option value="31d">Laatste 31 dagen</option>
          <option value="1y">Laatste jaar</option>
          <option value="all">Alles</option>
        </select>
      </div>

      {/* Statistieken kaarten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Bezoekers</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.visitors}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Zoekertjes</h3>
          <p className="text-3xl font-bold text-green-600">{stats.listings}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Verkocht</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.sales}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Verzendingen</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.shipments}</p>
          <p className="text-xs text-gray-500 mt-1">Binnenkort beschikbaar</p>
        </div>
      </div>

      {/* Grafieken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Lijndiagram voor dagelijkse bezoekers */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Dagelijkse Website Bezoekers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyVisitors}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visitors" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Staafdiagram voor dagelijkse bezoekers */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Bezoekers per Dag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyVisitors}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="visitors" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Extra rij voor staafdiagrammen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Staafdiagram voor nieuwe zoekertjes per dag */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Nieuwe Zoekertjes per Dag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyListings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="listings" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staafdiagram voor nieuwe gebruikers per dag */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Nieuwe Gebruikers per Dag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categorie verdeling tabel */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Verdeling per Categorie (Alle Actieve Zoekertjes)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Categorie</th>
                <th className="px-4 py-2 text-right">Aantal Zoekertjes</th>
                <th className="px-4 py-2 text-left">Subcategorieën</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((category, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2 font-medium">{category.name}</td>
                  <td className="px-4 py-2 text-right">{category.count}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {category.subcategories
                        .filter(sub => sub.count > 0)
                        .map((sub, subIndex) => (
                        <span key={subIndex} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {sub.name} ({sub.count})
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
