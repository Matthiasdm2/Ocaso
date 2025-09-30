import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Optional authentication - VAT verification is public data
    await supabase.auth.getSession(); // Just to initialize the client
    // Allow anonymous requests for VAT verification

    const { vatNumber } = await request.json();

    if (!vatNumber || typeof vatNumber !== 'string') {
      return NextResponse.json(
        { error: 'BTW nummer is verplicht' },
        { status: 400 }
      );
    }

    // Parse VAT number - Belgian format: BE0123456789
    const vatMatch = vatNumber.toUpperCase().match(/^([A-Z]{2})(\d+)$/);
    if (!vatMatch) {
      return NextResponse.json(
        { error: 'Ongeldig BTW nummer formaat. Gebruik formaat: BE0123456789' },
        { status: 400 }
      );
    }

    const countryCode = vatMatch[1];
    const vatNumberOnly = vatMatch[2];

    // VIES API call
    const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumberOnly}`;

    const response = await fetch(viesUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ocaso-Marketplace/1.0'
      }
    });

    if (!response.ok) {
      console.error('VIES API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Kon BTW nummer niet verifiëren. Probeer later opnieuw.' },
        { status: 500 }
      );
    }

    const viesData = await response.json();

    if (!viesData.isValid) {
      return NextResponse.json(
        { error: 'Dit BTW nummer is niet geldig volgens VIES' },
        { status: 400 }
      );
    }

    // Return validation result with company details if available
    return NextResponse.json({
      valid: true,
      vatNumber: viesData.vatNumber,
      countryCode: viesData.countryCode,
      requestDate: viesData.requestDate,
      name: viesData.name,
      address: viesData.address
    });

  } catch (error) {
    console.error('VIES verification error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij de verificatie' },
      { status: 500 }
    );
  }
}
