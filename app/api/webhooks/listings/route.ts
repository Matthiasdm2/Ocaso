export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

// Placeholder webhook endpoint to satisfy module export. Extend as needed.
export async function POST(req: Request) {
	try {
		const payload = await req.json().catch(() => null);
		// Acknowledge receipt
		return NextResponse.json({ ok: true, received: !!payload });
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 200 });
	}
}

export async function GET() {
	return NextResponse.json({ ok: true });
}
