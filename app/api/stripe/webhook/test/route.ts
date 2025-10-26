import { NextResponse } from "next/server";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function GET() {
  try {
    const supabase = supabaseServiceRole();
    
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from("profiles")
      .select("id, ocaso_credits")
      .limit(1);
    
    if (testError) {
      return NextResponse.json({ 
        status: "error", 
        message: "Database connection failed",
        error: testError.message 
      }, { status: 500 });
    }

    // Test credit update
    const testUserId = "test-user-id"; // Replace with actual test user ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ocaso_credits")
      .eq("id", testUserId)
      .single();

    return NextResponse.json({
      status: "ok",
      message: "Webhook test endpoint working",
      database: "connected",
      sample_profile: testData?.[0] || null,
      test_profile: profile || null
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      message: "Test failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
