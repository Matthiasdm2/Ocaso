"use client";

import { useEffect, useState } from "react";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  business_plan: string | null;
  subscription_active: boolean;
};

type PendingChange = {
  userId: string;
  userName: string;
  userEmail: string;
  oldPlan: string | null;
  newPlan: string | null;
};

export default function SubscriptionManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignUserEmail, setAssignUserEmail] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set()); // Track welke users worden geüpdatet

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Voeg timestamp toe om caching te voorkomen
      const res = await fetch(`/api/admin/users?subscriptions=true&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched users:", data.length, "users");
        setUsers(data || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch users:", res.status, errorData.error || res.statusText);
        alert(`Fout bij laden gebruikers: ${errorData.error || res.statusText}`);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Kon gebruikers niet laden. Controleer de verbinding.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const assignSubscription = async (id: string, plan: string) => {
    if (!id) {
      alert("Geen gebruiker ID gevonden");
      return;
    }
    
    // Mark user as updating
    setUpdatingUsers(prev => new Set(prev).add(id));
    
    try {
      console.log("🔄 Assigning subscription:", { id, plan });
      
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_plan: plan || null }),
      });
      
      let responseData;
      try {
        const text = await res.text();
        responseData = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("❌ Failed to parse response:", parseError);
        responseData = {};
      }
      
      console.log("📥 Subscription assignment response:", { 
        status: res.status, 
        ok: res.ok, 
        statusText: res.statusText,
        data: responseData
      });
      
      if (!res.ok) {
        const errorMsg = responseData.error || res.statusText || "Onbekende fout";
        console.error("❌ API Error:", errorMsg, responseData);
        alert(`Fout bij updaten (${res.status}): ${errorMsg}`);
        setUpdatingUsers(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      if (!responseData.success) {
        console.error("❌ Response indicates failure:", responseData);
        alert(`Update mislukt: ${responseData.error || "Onbekende fout"}`);
        setUpdatingUsers(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      // Gebruik response data als die beschikbaar is
      const updatedPlan = responseData.data?.business_plan || plan || null;
      const isActive = responseData.data?.subscription_active ?? !!(plan && plan !== "");
      
      console.log("✅ Update successful, updating UI:", { 
        updatedPlan, 
        isActive,
        responseData: responseData.data 
      });
      
      // Update local state direct met de nieuwe waarde
      setUsers(prevUsers => {
        const updated = prevUsers.map(user => 
          user.id === id 
            ? { 
                ...user, 
                business_plan: updatedPlan,
                subscription_active: isActive
              }
            : user
        );
        console.log("📊 Updated users state:", updated.find(u => u.id === id));
        return updated;
      });
      
      // Wacht even en refresh data, maar merge met huidige state om dropdown niet te resetten
      setTimeout(async () => {
        console.log("🔄 Refreshing user list from server...");
        const res = await fetch(`/api/admin/users?subscriptions=true&_t=${Date.now()}`);
        if (res.ok) {
          const freshData = await res.json();
          // Merge: behoud de geüpdatete waarde voor deze user als die nog aan het updaten is
          setUsers(prevUsers => {
            const currentUser = prevUsers.find(u => u.id === id);
            const freshUser = freshData.find((u: User) => u.id === id);
            
            // Als de fresh data dezelfde waarde heeft als wat we hebben geüpdatet, gebruik die
            // Anders behoud de huidige state (die is net geüpdatet)
            if (freshUser && currentUser) {
              // Check of de fresh data overeenkomt met wat we hebben geüpdatet
              if (freshUser.business_plan === updatedPlan) {
                // Database is gesynchroniseerd, gebruik fresh data
                return freshData;
              } else {
                // Database heeft nog oude data, behoud onze update
                return freshData.map((u: User) => 
                  u.id === id ? currentUser : u
                );
              }
            }
            return freshData;
          });
        }
        // Remove from updating set
        setUpdatingUsers(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 1500); // Verhoogd naar 1500ms voor betere sync
    } catch (error) {
      console.error("❌ Error assigning subscription:", error);
      alert(`Er ging iets mis bij het toewijzen van het abonnement: ${error instanceof Error ? error.message : "Onbekende fout"}`);
      setUpdatingUsers(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAssign = async () => {
    if (!assignUserEmail || !assignPlan) {
      alert("Selecteer eerst een gebruiker en een plan");
      return;
    }
    
    console.log("Handle assign:", { assignUserEmail, assignPlan, usersCount: users.length });
    
    // Find the user by email from the loaded users list
    const user = users.find(u => u.email === assignUserEmail);
    
    if (!user) {
      console.error("User not found:", { assignUserEmail, availableEmails: users.map(u => u.email) });
      alert(`Gebruiker niet gevonden met email: ${assignUserEmail}\n\nBeschikbare gebruikers: ${users.length}`);
      return;
    }
    
    if (!user.id) {
      alert("Gebruiker heeft geen ID");
      return;
    }
    
    console.log("Found user:", { id: user.id, email: user.email, name: user.full_name });
    
    // Toon bevestigingsmodal
    setPendingChange({
      userId: user.id,
      userName: user.full_name || "Onbekend",
      userEmail: user.email || "",
      oldPlan: user.business_plan || null,
      newPlan: assignPlan || null,
    });
  };

  const handleConfirmSubscriptionChange = async () => {
    if (!pendingChange) return;
    
    const userId = pendingChange.userId;
    const newPlan = pendingChange.newPlan || "";
    
    // Sluit modal eerst
    setPendingChange(null);
    
    // Voer update uit
    await assignSubscription(userId, newPlan);
    
    // Reset form fields
    setAssignUserEmail("");
    setAssignPlan("");
  };

  const getPlanDisplayName = (plan: string | null) => {
    if (!plan) return "Geen abonnement";
    const planMap: Record<string, string> = {
      "basis_maandelijks": "Basis Maandelijks",
      "basis_jaarlijks": "Basis Jaarlijks",
      "pro_maandelijks": "Pro Maandelijks",
      "pro_jaarlijks": "Pro Jaarlijks",
    };
    return planMap[plan] || plan;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">Laden...</div>
    </div>
  );

  return (
    <div>
      {/* Confirmation Modal */}
      {pendingChange && (
        <ConfirmationModal
          isOpen={!!pendingChange}
          onClose={() => {
            // Reset select dropdown door pendingChange te clearen
            // De key prop zorgt ervoor dat de select terugspringt naar originele waarde
            setPendingChange(null);
          }}
          onConfirm={handleConfirmSubscriptionChange}
          title="Abonnement wijzigen?"
          message={`Weet je zeker dat je het abonnement wilt wijzigen voor ${pendingChange.userName} (${pendingChange.userEmail})?\n\nHuidig abonnement: ${getPlanDisplayName(pendingChange.oldPlan)}\nNieuw abonnement: ${getPlanDisplayName(pendingChange.newPlan)}`}
          confirmText="Wijzigen"
          cancelText="Annuleren"
          variant={pendingChange.newPlan ? "warning" : "danger"}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Abonnementen</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {users.length} gebruikers
          </span>
        </div>

        {/* Handmatige toewijzing */}
        <div className="bg-white rounded-2xl shadow-smooth p-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Abonnement Toewijzen</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
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
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {(showUserDropdown || assignUserEmail) && users.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-smooth max-h-40 overflow-y-auto z-10">
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
                        className="p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setAssignUserEmail(user.email || "");
                          setShowUserDropdown(false);
                        }}
                      >
                        <div className="font-medium text-gray-900">{user.full_name || "Geen naam"}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <select
              value={assignPlan}
              onChange={(e) => setAssignPlan(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Kies Plan</option>
              <option value="basis_maandelijks">Basis Maandelijks</option>
              <option value="basis_jaarlijks">Basis Jaarlijks</option>
              <option value="pro_maandelijks">Pro Maandelijks</option>
              <option value="pro_jaarlijks">Pro Jaarlijks</option>
            </select>
            <button 
              onClick={handleAssign} 
              className="rounded-full bg-primary text-black px-6 py-2.5 text-sm font-semibold hover:bg-primary/80 transition-colors whitespace-nowrap"
            >
              Toewijzen
            </button>
          </div>
        </div>

        {/* Gebruikers tabel */}
        <div className="bg-white rounded-2xl shadow-smooth border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Naam</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actief</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Acties</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getPlanDisplayName(user.business_plan)}</td>
                    <td className="px-4 py-3">
                      {user.subscription_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Ja
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Nee
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          key={`${user.id}-${user.business_plan || 'none'}`}
                          value={user.business_plan || ""}
                          disabled={updatingUsers.has(user.id) || pendingChange?.userId === user.id}
                          onChange={(e) => {
                            const newPlan = e.target.value;
                            const oldPlan = user.business_plan || null;
                            if (newPlan !== oldPlan) {
                              // Toon bevestigingsmodal
                              setPendingChange({
                                userId: user.id,
                                userName: user.full_name || "Onbekend",
                                userEmail: user.email || "",
                                oldPlan: oldPlan,
                                newPlan: newPlan || null,
                              });
                            }
                          }}
                          className={`px-3 py-1.5 border border-gray-200 rounded-full bg-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                            updatingUsers.has(user.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <option value="">Geen</option>
                          <option value="basis_maandelijks">Basis Maandelijks</option>
                          <option value="basis_jaarlijks">Basis Jaarlijks</option>
                          <option value="pro_maandelijks">Pro Maandelijks</option>
                          <option value="pro_jaarlijks">Pro Jaarlijks</option>
                        </select>
                        {updatingUsers.has(user.id) && (
                          <span className="text-xs text-gray-500">Updating...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
