import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import translate from 'translate';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = await request.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Missing text or targetLang' }, { status: 400 });
    }

    // Use the translate package
    const translatedText = await translate(text, { from: 'nl', to: targetLang });

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
