export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";

async function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripeSecret = getStripeSecretKey();
    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, {
        status: 500,
      });
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "") || null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let filename = `upload-${Date.now()}`;
    let contentType = req.headers.get("content-type") ||
      "application/octet-stream";
    let fileBuffer: Buffer | null = null;

    // Parse formData for file upload
    try {
      const form = await req.formData();
      const fileField = form.get("file") || form.get("upload") ||
        form.get("image");
      if (
        fileField && typeof fileField === "object" && "arrayBuffer" in fileField
      ) {
        const ab = await (fileField as File).arrayBuffer();
        fileBuffer = Buffer.from(ab);
        filename = (fileField as File).name || filename;
        contentType = (fileField as File).type || contentType;
      }
    } catch (err) {
      console.error("FormData parsing failed:", err);
      return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
    }

    // If no file found in formData, try raw body as fallback
    if (!fileBuffer) {
      const url = new URL(req.url);
      filename = url.searchParams.get("filename") || filename;
      contentType = req.headers.get("content-type") || contentType;
      try {
        const buffer = await req.arrayBuffer();
        fileBuffer = Buffer.from(buffer);
      } catch (err) {
        console.error("Raw body reading failed:", err);
        return NextResponse.json({ error: "no_file_provided" }, {
          status: 400,
        });
      }
    }

    // Validation
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "empty_file" }, { status: 400 });
    }
    if (fileBuffer.length > maxBytes) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (contentType && !allowed.includes(contentType.split(";")[0])) {
      return NextResponse.json({ error: "invalid_mime" }, { status: 400 });
    }

    // Stream to Stripe Files API when possible
    try {
      const stream = await bufferToStream(fileBuffer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripeFile = await (stripe.files as any).create({
        file: { data: stream, name: filename, type: contentType },
        purpose: "identity_document",
      });
      return NextResponse.json({ file: stripeFile });
    } catch (err) {
      // Last resort: upload as buffer
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripeFile = await (stripe.files as any).create({
          file: { data: fileBuffer, name: filename, type: contentType },
          purpose: "identity_document",
        });
        return NextResponse.json({ file: stripeFile });
      } catch (e) {
        console.error("stripe/files.create failed", e, err);
        return NextResponse.json({ error: "file_upload_failed" }, {
          status: 500,
        });
      }
    }
  } catch (e) {
    console.error("stripe/custom/file error", e);
    return NextResponse.json({ error: "file_upload_failed" }, { status: 500 });
  }
}
