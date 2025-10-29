
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
type Ctx = { params: { id: string } };

export async function GET(_: Request, { params }: Ctx) {
  return NextResponse.json({ id: params.id, ok: true });
}

export async function PUT(_: Request, { params }: Ctx) {
  return NextResponse.json({ id: params.id, ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  return NextResponse.json({ id: params.id, ok: true });
}
