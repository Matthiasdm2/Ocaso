
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function POST() {
  // maak nieuw bericht
  return NextResponse.json({ message: 'POST request received' });
}

export async function GET() {
  // optioneel: lijst berichten
  return NextResponse.json({ message: 'GET request received' });
}
