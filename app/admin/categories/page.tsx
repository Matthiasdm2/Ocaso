"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

const supabase = createClient();

import {
    createCategory,
    createSubcategory,
    importCategoriesFromJsonAction,
    reorderCategory,
    reorderSubcategory,
    toggleCategory,
    toggleSubcategory
} from "./actions";

type Sub = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  category_id: number;
};
type Cat = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  subs: Sub[];
};

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("categories")
      .select(`
        id, name, slug, sort_order, is_active,
        subs:subcategories ( id, name, slug, sort_order, is_active, category_id )
      `)
      .order("sort_order", { ascending: true })
      .order("sort_order", { ascending: true, foreignTable: "subcategories" });

    if (error) setErr(error.message);
    else setCats((data ?? []).map((c: Cat) => ({ ...c, subs: (c.subs ?? []) as Sub[] })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categorieën beheren</h1>
        <form action={importCategoriesFromJsonAction}>
          <button
            className="btn-primary"
            onClick={(e) => {
              if (!confirm("Weet je zeker dat je subcategorieën wilt importeren uit categories.json? Dit kan bestaande subcategorieën overschrijven.")) {
                e.preventDefault();
              }
            }}
          >
            Importeer subcategorieën
          </button>
        </form>
      </div>

      {/* Nieuwe categorie */}
      <form
        action={async (formData) => {
          const res = await createCategory(formData);
          if (!res.ok) alert(res.error);
          await load();
        }}
        className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <input name="name" placeholder="Naam" className="filter-input" required />
        <input name="slug" placeholder="Slug (uniek)" className="filter-input" required />
        <input name="sort_order" type="number" placeholder="Sort order" className="filter-input" defaultValue={0} />
        <button className="btn-primary md:col-span-1">Categorie toevoegen</button>
      </form>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && (
        <div className="space-y-4">
          {cats.map((c) => (
            <div key={c.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-500">{c.slug} • order {c.sort_order}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      const order = Math.max(0, c.sort_order - 1);
                      const res = await reorderCategory(c.id, order);
                      if (!res.ok) alert(res.error);
                      await load();
                    }}
                  >
                    ▲
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      const res = await reorderCategory(c.id, c.sort_order + 1);
                      if (!res.ok) alert(res.error);
                      await load();
                    }}
                  >
                    ▼
                  </button>
                  <button
                    className={`px-3 py-1 rounded ${c.is_active ? "bg-green-600 text-white" : "bg-gray-300"}`}
                    onClick={async () => {
                      const res = await toggleCategory(c.id, !c.is_active);
                      if (!res.ok) alert(res.error);
                      await load();
                    }}
                  >
                    {c.is_active ? "Actief" : "Inactief"}
                  </button>
                </div>
              </div>

              {/* nieuwe sub */}
              <form
                action={async (formData) => {
                  formData.set("category_id", String(c.id));
                  const res = await createSubcategory(formData);
                  if (!res.ok) alert(res.error);
                  await load();
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3"
              >
                <input name="name" placeholder="Sub-naam" className="filter-input" required />
                <input name="slug" placeholder="Sub-slug (uniek)" className="filter-input" required />
                <input name="sort_order" type="number" placeholder="Sort order" className="filter-input" defaultValue={0} />
                <button className="btn-outline">Subcategorie toevoegen</button>
                <input type="hidden" name="category_id" value={c.id} />
              </form>

              {/* sublijst */}
              <div className="divide-y">
                {c.subs.map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-gray-500">{s.slug} • order {s.sort_order}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-secondary"
                        onClick={async () => {
                          const order = Math.max(0, s.sort_order - 1);
                          const res = await reorderSubcategory(s.id, order);
                          if (!res.ok) alert(res.error);
                          await load();
                        }}
                      >
                        ▲
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={async () => {
                          const res = await reorderSubcategory(s.id, s.sort_order + 1);
                          if (!res.ok) alert(res.error);
                          await load();
                        }}
                      >
                        ▼
                      </button>
                      <button
                        className={`px-3 py-1 rounded ${s.is_active ? "bg-green-600 text-white" : "bg-gray-300"}`}
                        onClick={async () => {
                          const res = await toggleSubcategory(s.id, !s.is_active);
                          if (!res.ok) alert(res.error);
                          await load();
                        }}
                      >
                        {s.is_active ? "Actief" : "Inactief"}
                      </button>
                    </div>
                  </div>
                ))}
                {c.subs.length === 0 && (
                  <div className="py-2 text-sm text-gray-500">Nog geen subcategorieën</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
