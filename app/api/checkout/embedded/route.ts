// Minimal placeholder endpoint to satisfy Next.js module requirements.
// This route is not used by the app; kept to avoid accidental 404s if requested.

export async function GET() {
    return new Response("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
    });
}

export const dynamic = "force-static";
