"use client";

import React, { useEffect, useState } from "react";

import ConfirmationModal from "@/components/admin/ConfirmationModal";

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
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email: string } | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Niet ingelogd. Log in en probeer opnieuw.");
        } else if (res.status === 403) {
          setError("Geen admin-rechten voor deze actie.");
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body?.error || `Fout ${res.status}`);
        }
        setUsers([]);
      } else {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      setError("Kon gebruikers niet laden. Controleer verbinding.");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    // Toon bevestigingsmodal
    setUserToDelete({
      id: user.id,
      name: user.full_name || "Onbekend",
      email: user.email || "",
    });
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: "DELETE" });
      const responseData = await res.json().catch(() => ({}));
      
      if (res.ok) {
        // Remove from local state immediately
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setUserToDelete(null);
        
        // Refresh after a delay to ensure database is synced
        setTimeout(async () => {
          await fetchUsers();
        }, 500);
      } else {
        const errorMsg = responseData.error || res.statusText || "Onbekende fout";
        console.error("❌ Delete failed:", errorMsg);
        alert(`Fout bij verwijderen: ${errorMsg}\n\nControleer server logs voor details.`);
        setUserToDelete(null);
      }
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      alert(`Er ging iets mis bij het verwijderen: ${error instanceof Error ? error.message : "Onbekende fout"}`);
      setUserToDelete(null);
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
      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <ConfirmationModal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Gebruiker verwijderen?"
          message={`Weet je zeker dat je deze gebruiker wilt verwijderen?\n\nNaam: ${userToDelete.name}\nEmail: ${userToDelete.email}\n\nDeze actie kan niet ongedaan worden gemaakt. Alle gegevens van deze gebruiker (profiel, listings, orders, berichten) zullen permanent worden verwijderd.`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
        />
      )}

      {/* Header with filters */}
      <div className="bg-white rounded-2xl shadow-smooth p-6 mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Gebruikers</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
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
                className="w-full sm:w-48 pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
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
                className="w-full sm:w-48 pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            {(filters.name || filters.email) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Wissen
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-smooth border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Naam</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Accountsoort</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admin</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && users.length > 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Geen gebruikers gevonden met de huidige filters.
                  </td>
                </tr>
              )}
              {filteredUsers.length === 0 && users.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Geen gebruikers gevonden.
                  </td>
                </tr>
              )}
              {filteredUsers.map(user => (
                <React.Fragment key={user.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.account_type}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={user.is_admin}
                        onChange={() => toggleAdmin(user.id, user.is_admin)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                        className="rounded-full bg-primary text-black px-4 py-1.5 text-sm font-semibold hover:bg-primary/80 transition-colors"
                      >
                        {expanded === user.id ? "Sluit" : "Bewerk"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-full bg-red-500 text-white px-4 py-1.5 text-sm font-semibold hover:bg-red-600 transition-colors"
                        onClick={() => deleteUser(user.id)}
                      >
                        Verwijder
                      </button>
                    </td>
                  </tr>
                  {expanded === user.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50">
                        <UserDetailsForm user={user} onUpdate={updateUser} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
