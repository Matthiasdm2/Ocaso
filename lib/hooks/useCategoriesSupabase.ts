// lib/hooks/useCategoriesSupabase.ts
"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export type CategoryNode = {
  id: string;            // slug van de hoofdcategorie
  name: string;          // naam van de hoofdcategorie
  subcategories: string[]; // lijst met subcategorie-namen
};

export function useCategoriesSupabase() {
  const [list, setList] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("init");

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setStatus("loading");
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id,name,parent_id,position")
          .order("position", { ascending: true });

        if (error) {
          setStatus(`error:${error.message}`);
          if (mounted) setList([]);
          return;
        }
        const rows = data || [];
        if (!rows.length) {
          setStatus("empty");
          if (mounted) setList([]);
          return;
        }

        type CategoryRow = {
          id: string;
          name: string;
          parent_id: string | null;
          position: number;
        };

        const parents = rows.filter((r: CategoryRow) => !r.parent_id);
        const byParent = new Map<string, { id: string; name: string }[]>();
        for (const r of rows as CategoryRow[]) {
          if (r.parent_id) {
            const arr = byParent.get(r.parent_id) || [];
            arr.push({ id: r.id, name: r.name });
            byParent.set(r.parent_id, arr);
          }
        }

        const shaped: CategoryNode[] = parents.map((p: CategoryRow) => ({
          id: p.id,
          name: p.name,
          subcategories: (byParent.get(p.id) || []).map((c) => c.name),
        }));

        setStatus("ok");
        if (mounted) setList(shaped);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "unknown";
        setStatus(`exception:${errorMessage}`);
        if (mounted) setList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [supabase]);

  return { list, loading, status };
}
