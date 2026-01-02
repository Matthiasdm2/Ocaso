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
    } else {
      // Reset to default values on error
      setStats({ visitors: 0, listings: 0, sales: 0, shipments: 0 });
    }

    if (categoryRes.ok) {
      const data = await categoryRes.json();
      setCategoryStats(data);
    } else {
      setCategoryStats([]);
    }

    if (visitorsRes.ok) {
      const data = await visitorsRes.json();
      setDailyVisitors(data);
    } else {
      setDailyVisitors([]);
    }

    if (listingsRes.ok) {
      const data = await listingsRes.json();
      setDailyListings(data);
    } else {
      setDailyListings([]);
    }

    if (usersRes.ok) {
      const data = await usersRes.json();
      setDailyUsers(data);
    } else {
      setDailyUsers([]);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">Laden...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Periode selectie */}
      <div className="bg-white rounded-2xl shadow-smooth p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">Periode</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
        >
          <option value="7d">Laatste 7 dagen</option>
          <option value="31d">Laatste 31 dagen</option>
          <option value="1y">Laatste jaar</option>
          <option value="all">Alles</option>
        </select>
      </div>

      {/* Statistieken kaarten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Bezoekers</h3>
          <p className="text-3xl font-bold text-primary">{stats.visitors.toLocaleString('nl-BE')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Zoekertjes</h3>
          <p className="text-3xl font-bold text-emerald-600">{stats.listings.toLocaleString('nl-BE')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Verkocht</h3>
          <p className="text-3xl font-bold text-secondary">{stats.sales.toLocaleString('nl-BE')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Verzendingen</h3>
          <p className="text-3xl font-bold text-orange-500">{stats.shipments.toLocaleString('nl-BE')}</p>
          <p className="text-xs text-gray-500 mt-2">Binnenkort beschikbaar</p>
        </div>
      </div>

      {/* Grafieken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lijndiagram voor dagelijkse bezoekers */}
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Dagelijkse Website Bezoekers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyVisitors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="visitors" stroke="#6EE7B7" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Staafdiagram voor dagelijkse bezoekers */}
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bezoekers per Dag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyVisitors}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="visitors" fill="#6EE7B7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Extra rij voor staafdiagrammen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staafdiagram voor nieuwe zoekertjes per dag */}
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Nieuwe Zoekertjes per Dag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyListings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="listings" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staafdiagram voor nieuwe gebruikers per dag */}
        <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Nieuwe Gebruikers per Dag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="users" fill="#93C5FD" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categorie verdeling tabel */}
      <div className="bg-white p-6 rounded-2xl shadow-smooth border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Verdeling per Categorie (Alle Actieve Zoekertjes)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Categorie</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Aantal Zoekertjes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Subcategorieën</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((category, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{category.count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(category.subcategories || [])
                        .filter(sub => sub.count > 0)
                        .map((sub, subIndex) => (
                        <span key={subIndex} className="bg-primary/20 text-gray-900 px-3 py-1 rounded-full text-xs font-medium">
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
