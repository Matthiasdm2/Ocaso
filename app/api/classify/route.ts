import { NextResponse } from "next/server";

export const runtime = "nodejs";

function classifyText(text: string): { category_index: number; confidence: number } {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("telefoon") || lowerText.includes("laptop") || lowerText.includes("computer")) {
    return { category_index: 0, confidence: 0.8 };
  }
  if (lowerText.includes("shirt") || lowerText.includes("broek") || lowerText.includes("kleding")) {
    return { category_index: 1, confidence: 0.8 };
  }
  if (lowerText.includes("boek") || lowerText.includes("roman")) {
    return { category_index: 2, confidence: 0.8 };
  }
  if (lowerText.includes("tuin") || lowerText.includes("huis") || lowerText.includes("meubel")) {
    return { category_index: 3, confidence: 0.8 };
  }
  if (lowerText.includes("auto") || lowerText.includes("fiets") || lowerText.includes("wagen")) {
    return { category_index: 4, confidence: 0.8 };
  }
  if (lowerText.includes("sport") || lowerText.includes("fitness")) {
    return { category_index: 5, confidence: 0.8 };
  }
  if (lowerText.includes("gitaar") || lowerText.includes("cd") || lowerText.includes("muziek")) {
    return { category_index: 6, confidence: 0.8 };
  }
  if (lowerText.includes("speelgoed") || lowerText.includes("lego")) {
    return { category_index: 7, confidence: 0.8 };
  }
  // Default to Overig
  return { category_index: 8, confidence: 0.5 };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Handle both { text } and { images } for backward compatibility
    let text = body.text;
    if (!text && body.images) {
      // If no text, use a placeholder or try to infer from images (not implemented)
      text = "algemeen"; // Placeholder
    }
    if (!text) {
      return NextResponse.json({ category_index: 8, confidence: 0.1 }, { status: 200 });
    }

    // Use text-based classification
    const result = classifyText(text);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("/api/classify error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
