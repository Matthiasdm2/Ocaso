import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple test without database access
    return NextResponse.json({
      status: "ok",
      message: "Webhook test endpoint is working",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
