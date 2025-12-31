import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check for profile provisioning
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'profile-provisioning'
    });
  } catch (error) {
    console.error('Profile provisioning health check failed:', error);
    return NextResponse.json(
      { status: 'error', error: 'Health check failed' },
      { status: 500 }
    );
  }
}
