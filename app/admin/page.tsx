import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabaseServer";

import AdminPanel from "./AdminPanel";

export const metadata = {
  title: "Admin Panel - OCASO",
  description: "OCASO administratie paneel voor gebruikers, listings en systeembeheer",
};

export default async function AdminPage() {
  const supabase = supabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    redirect("/");
  }

  if (!profile?.is_admin) {
    // Instead of redirecting, show an error message
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Toegang Geweigerd</h1>
            <p className="text-gray-600 mb-6">
              Je hebt geen administrator rechten voor deze pagina.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Neem contact op met een administrator om admin rechten te krijgen.
            </p>
            <a href="/" className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              Terug naar website
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}
