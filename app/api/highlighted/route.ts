export const runtime = "nodejs";
import { NextResponse } from "next/server";

import type { Listing } from "@/lib/types";

// Minimal mock listing matching the project's Listing type. Keep only known props.
const BASE: Partial<Listing> = {
  id: "x",
  title: "Uitgelicht item",
  description: "Opvallend aanbod binnen deze categorie",
  price: 199,
  state: "good",
  location: "Gent",
  images: [],
  created_at: new Date().toISOString(),
  sponsored: true,
};

function make(id: number, title: string): Listing {
  return {
    ...(BASE as Listing),
    id: String(id),
    title,
    price: 50 + ((id * 13) % 400),
  } as Listing;
}

export async function GET(request: Request) {
  // intentionally ignore query params for the mock endpoint
  void request;

  const titles = [
    "Topdeal",
    "Premium keuze",
    "Aanrader",
    "Hot item",
    "Kansje",
    "Nieuw binnen",
    "Netjes",
    "Bijna nieuw",
    "Scherpe prijs",
    "Populair",
  ];
  const items = Array.from({ length: 12 }).map((_, i) =>
    make(i + 1, `${titles[i % titles.length]} #${i + 1}`),
  );

  return NextResponse.json({ items });
}
