import { NextResponse } from "next/server";

function rand(n: number) {
  return Math.floor(Math.random() * n);
}

export async function GET() {
  const now = new Date();
  const last30 = Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(now.getTime() - (29 - i) * 86400000)
      .toISOString()
      .slice(0, 10),
    views: 50 + rand(120),
    messages: 2 + rand(10),
    favorites: rand(8),
    sales: rand(3),
  }));

  const totals = last30.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      messages: acc.messages + d.messages,
      favorites: acc.favorites + d.favorites,
      sales: acc.sales + d.sales,
    }),
    { views: 0, messages: 0, favorites: 0, sales: 0 },
  );

  const topListings = Array.from({ length: 8 }).map((_, i) => ({
    id: "L" + (i + 1),
    title: `Mijn item ${i + 1}`,
    views: 300 + rand(500),
    messages: 5 + rand(20),
    favorites: rand(30),
    price: 20 + rand(500),
  }));

  return NextResponse.json({ totals, last30, topListings });
}
