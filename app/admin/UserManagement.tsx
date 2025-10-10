"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string | null;
  is_admin: boolean;
  phone?: string | null;
  bio?: string | null;
  address?: Record<string, unknown>;
  bank?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  avatar_url?: string | null;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Weet je het zeker?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const toggleAdmin = async (id: string, current: boolean) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_admin: !current }),
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, is_admin: !current } : u));
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
    }
  };

  const clearFilters = () => {
    setFilters({
      name: "",
      email: "",
    });
  };

  const filteredUsers = users.filter(user => {
    // Name filter
    if (filters.name && !user.full_name?.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }

    // Email filter
    if (filters.email && !user.email?.toLowerCase().includes(filters.email.toLowerCase())) {
      return false;
    }

    return true;
  });

  if (loading) return <div>Laden...</div>;

  return (
    <div>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Gebruikers</h2>
          <span className="text-sm text-gray-500">
            {filteredUsers.length} van {users.length}
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search by name */}
          <div className="relative">
            <input
              type="text"
              placeholder="Zoek op naam..."
              value={filters.name}
              onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
              className="w-full sm:w-48 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Search by email */}
          <div className="relative">
            <input
              type="text"
              placeholder="Zoek op email..."
              value={filters.email}
              onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
              className="w-full sm:w-48 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          {(filters.name || filters.email) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Wissen
            </button>
          )}
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Naam</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Accountsoort</th>
            <th className="border p-2">Admin</th>
            <th className="border p-2">Details</th>
            <th className="border p-2">Acties</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 && users.length > 0 && (
            <tr>
              <td colSpan={7} className="border p-4 text-center text-gray-500">
                Geen gebruikers gevonden met de huidige filters.
              </td>
            </tr>
          )}
          {filteredUsers.length === 0 && users.length === 0 && !loading && (
            <tr>
              <td colSpan={7} className="border p-4 text-center text-gray-500">
                Geen gebruikers gevonden.
              </td>
            </tr>
          )}
          {filteredUsers.map(user => (
            <>
              <tr key={user.id}>
                <td className="border p-2">{user.id}</td>
                <td className="border p-2">{user.full_name}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">{user.account_type}</td>
                <td className="border p-2">
                  <input
                    type="checkbox"
                    checked={user.is_admin}
                    onChange={() => toggleAdmin(user.id, user.is_admin)}
                  />
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    {expanded === user.id ? "Sluit" : "Bewerk"}
                  </button>
                </td>
                <td className="border p-2">
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => deleteUser(user.id)}
                  >
                    Verwijder
                  </button>
                </td>
              </tr>
              {expanded === user.id && (
                <tr>
                  <td colSpan={7} className="border p-4 bg-gray-50">
                    <UserDetailsForm user={user} onUpdate={updateUser} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDetailsForm({ user, onUpdate }: { user: User; onUpdate: (id: string, updates: Partial<User>) => void }) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    bio: user.bio || "",
    avatar_url: user.avatar_url || "",
    account_type: user.account_type || "",
    address: user.address || {},
    bank: user.bank || {},
    preferences: user.preferences || {},
    notifications: user.notifications || {},
    password: "",
  });

  const handleChange = (field: string, value: unknown) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<User> = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'password' && formData[key as keyof typeof formData] !== user[key as keyof User]) {
        (updates as unknown as Record<string, unknown>)[key] = formData[key as keyof typeof formData];
      }
    });
    if (formData.password) {
      (updates as unknown as Record<string, unknown>).password = formData.password;
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(user.id, updates);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Volledige Naam</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Telefoon</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Accountsoort</label>
          <select
            value={formData.account_type}
            onChange={(e) => handleChange("account_type", e.target.value)}
            className="border p-2 w-full"
          >
            <option value="">Geen</option>
            <option value="business">Zakelijk</option>
            <option value="personal">Persoonlijk</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Avatar URL</label>
          <input
            type="text"
            value={formData.avatar_url}
            onChange={(e) => handleChange("avatar_url", e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Nieuw Wachtwoord (optioneel)</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            className="border p-2 w-full"
            placeholder="Laat leeg om niet te wijzigen"
          />
        </div>
      </div>
      <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
        Opslaan
      </button>
    </form>
  );
}
