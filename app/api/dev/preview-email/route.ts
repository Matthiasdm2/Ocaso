import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { join } = await import("path");
    const { readFile } = await import("fs/promises");
    const file = join(process.cwd(), "emails", "verification.html");
    let html = await readFile(file, "utf8");
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ocaso.be";
    const url = `${site}/auth/confirm?token=example-token`;
    // Simple placeholder substitution for preview only
    html = html.replaceAll("{{ .ConfirmationURL }}", url).replaceAll(
      "{{ .SiteURL }}",
      site,
    ).replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({
      error: "Failed to render preview",
      details: String(e),
    }, { status: 500 });
  }
}
