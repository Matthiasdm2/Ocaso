export const runtime = "nodejs";
/* eslint-disable simple-import-sort/imports */
import { getServerUser } from "@/lib/getServerUser";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user } = await getServerUser(req);
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    hasAuthHeader: !!authHeader,
    authHeaderStart: authHeader ? authHeader.slice(0, 40) + "..." : null,
  });
}
