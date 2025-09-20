import { NextResponse } from "next/server";

const NAMES = [
  "Anke",
  "Bram",
  "Charlotte",
  "Daan",
  "Evi",
  "Filip",
  "Gwen",
  "Hugo",
  "Iris",
  "Jens",
];
const TITLES = [
  "iPhone 13",
  "Retro sofa",
  "Racefiets",
  "Koffiezet",
  "Smartwatch",
  "Kinderfiets",
  "AirPods",
  "Laptop",
  "TV 55 inch",
  "Gaming monitor",
];

function pick<T>(a: T[]) {
  return a[Math.floor(Math.random() * a.length)];
}

export async function GET() {
  const items = Array.from({ length: 14 }).map((_, i) => {
    const id = "C" + (i + 1);
    return {
      id,
      with: pick(NAMES),
      listingTitle: pick(TITLES),
      lastMessage: "Kan de prijs nog een beetje omlaag?",
      lastAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      unread: i % 4 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
    };
  });
  return NextResponse.json({ items });
}
