"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  business_plan: string | null;
  subscription_active: boolean;
};

export default function SubscriptionManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignUserEmail, setAssignUserEmail] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users?subscriptions=true");
    if (res.ok) {
      const data = await res.json();
      console.log("Fetched users:", data);
      setUsers(data);
    } else {
      console.error("Failed to fetch users:", res.status, res.statusText);
    }
    setLoading(false);
  };

  const assignSubscription = async (id: string, plan: string) => {
    const res = await fetch(`/api/admin/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_plan: plan }),
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, business_plan: plan, subscription_active: true } : u));
    }
  };

  const handleAssign = async () => {
    if (!assignUserEmail || !assignPlan) return;
    // Find the user by email from the loaded users list
    const user = users.find(u => u.email === assignUserEmail);
    if (user) {
      await assignSubscription(user.id, assignPlan);
      setAssignUserEmail("");
      setAssignPlan("");
    } else {
      alert("Gebruiker niet gevonden");
    }
  };

  if (loading) return <div>Laden...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Abonnementen</h2>

      {/* Handmatige toewijzing */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold mb-2">Abonnement Toewijzen</h3>
        <div className="flex gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Zoek gebruiker (naam of e-mail)"
              value={assignUserEmail}
              onChange={(e) => {
                setAssignUserEmail(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
              className="border p-2 w-64"
            />
            {(showUserDropdown || assignUserEmail) && users.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto z-10">
                {users
                  .filter(user =>
                    assignUserEmail === "" ||
                    (user.full_name || "").toLowerCase().includes(assignUserEmail.toLowerCase()) ||
                    (user.email || "").toLowerCase().includes(assignUserEmail.toLowerCase())
                  )
                  .slice(0, 10)
                  .map(user => (
                    <div
                      key={user.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setAssignUserEmail(user.email || "");
                        setShowUserDropdown(false);
                      }}
                    >
                      {user.full_name || "Geen naam"} ({user.email})
                    </div>
                  ))}
              </div>
            )}
          </div>
          <select
            value={assignPlan}
            onChange={(e) => setAssignPlan(e.target.value)}
            className="border p-2"
          >
            <option value="">Kies Plan</option>
            <option value="basis_maandelijks">Basis Maandelijks</option>
            <option value="basis_jaarlijks">Basis Jaarlijks</option>
            <option value="pro_maandelijks">Pro Maandelijks</option>
            <option value="pro_jaarlijks">Pro Jaarlijks</option>
          </select>
          <button onClick={handleAssign} className="bg-blue-500 text-white px-4 py-2 rounded">
            Toewijzen
          </button>
        </div>
      </div>

      {/* Gebruikers tabel */}
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Naam</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Plan</th>
            <th className="border p-2">Actief</th>
            <th className="border p-2">Acties</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="border p-2">{user.id}</td>
              <td className="border p-2">{user.full_name}</td>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">{user.business_plan}</td>
              <td className="border p-2">{user.subscription_active ? "Ja" : "Nee"}</td>
              <td className="border p-2">
                <select
                  onChange={(e) => assignSubscription(user.id, e.target.value)}
                  defaultValue={user.business_plan || ""}
                >
                  <option value="">Geen</option>
                  <option value="basis_maandelijks">Basis Maandelijks</option>
                  <option value="basis_jaarlijks">Basis Jaarlijks</option>
                  <option value="pro_maandelijks">Pro Maandelijks</option>
                  <option value="pro_jaarlijks">Pro Jaarlijks</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
