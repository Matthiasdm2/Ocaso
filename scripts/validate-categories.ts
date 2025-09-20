// scripts/validate-categories.ts
import fs from "node:fs";
import path from "node:path";

type Node = {
  name: string;
  slug: string;
  is_active?: boolean;
  sort_order?: number;
  subs?: Node[];
};

type CollectedSlug = { level: number; slug: string; name: string; path: string };

function collectSlugs(nodes: Node[], level = 1, pathNames: string[] = [], bag: CollectedSlug[] = []) {
  nodes.forEach((n) => {
    bag.push({ level, slug: n.slug, name: n.name, path: [...pathNames, n.name].join(" > ") });
    if (n.subs?.length) collectSlugs(n.subs, level + 1, [...pathNames, n.name], bag);
  });
  return bag;
}

function touchSortOrder(nodes: Node[]) {
  nodes.forEach((n, i) => {
    if (typeof n.sort_order !== "number") n.sort_order = i + 1;
    if (!("is_active" in n)) n.is_active = true;
    if (n.subs?.length) touchSortOrder(n.subs);
  });
}

function validate(nodes: Node[]) {
  const errors: string[] = [];
  const warn: string[] = [];

  // Basis: veldcontrole
  const checkFields = (arr: Node[], ctx: string) => {
    const local = new Set<string>();
    arr.forEach((n) => {
      if (!n.name?.trim()) errors.push(`Lege name in ${ctx}`);
      if (!n.slug?.trim()) errors.push(`Lege slug in ${ctx} (${n.name})`);
      if (local.has(n.slug)) errors.push(`Dubbele slug binnen niveau ${ctx}: ${n.slug}`);
      local.add(n.slug);
      if (n.subs?.length) checkFields(n.subs, `${ctx} > ${n.name}`);
    });
  };
  checkFields(nodes, "root");

  // Globale slug-botsingen (zelfde slug op meerdere plekken kan; we geven warning)
  const all = collectSlugs(nodes);
  const seen = new Map<string, string[]>();
  for (const s of all) {
    const arr = seen.get(s.slug) ?? [];
    arr.push(s.path);
    seen.set(s.slug, arr);
  }
  for (const [slug, paths] of seen) {
    if (paths.length > 1) warn.push(`Slug "${slug}" komt voor op ${paths.length} plekken:\n  - ${paths.join("\n  - ")}`);
  }

  return { errors, warn };
}

function main() {
  const file = path.join(process.cwd(), "data", "categories.json");
  const raw = fs.readFileSync(file, "utf8");
  const json: Node[] = JSON.parse(raw);

  touchSortOrder(json);
  const { errors, warn } = validate(json);

  if (errors.length) {
    console.error("❌ Validatiefouten:\n" + errors.map((e) => " - " + e).join("\n"));
    process.exit(1);
  }
  if (warn.length) {
    console.warn("⚠️ Waarschuwingen:\n" + warn.map((w) => " - " + w).join("\n"));
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2), "utf8");
  console.log("✅ categories.json is valide & genormaliseerd.");
}

main();
