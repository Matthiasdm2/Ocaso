import { NextResponse } from "next/server";

type PopularProduct = {
  id: string;
  title: string;
  thumb?: string | null;
  sellers: number;
};

// Optional: read from DB here; kept simple as a safe mock.
const MOCK_POPULAR: PopularProduct[] = [
  { id: "pp1", title: "iPhone 13", thumb: null, sellers: 12 },
  { id: "pp2", title: "Gazelle e-bike", thumb: null, sellers: 6 },
  { id: "pp3", title: "Vintage kast", thumb: null, sellers: 9 },
  { id: "pp4", title: "Nike Dunk Low", thumb: null, sellers: 7 },
  { id: "pp5", title: "Marantz versterker", thumb: null, sellers: 4 },
];

export async function GET() {
  return NextResponse.json({ items: MOCK_POPULAR });
}
