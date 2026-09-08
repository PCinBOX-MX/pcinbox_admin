import { createSign } from "crypto";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function signMessage(toSign: string): Promise<string> {
  const keyPath = process.env.QZ_PRIVATE_KEY_PATH;
  if (!keyPath) {
    throw new Error(
      "Falta QZ_PRIVATE_KEY_PATH en .env.local (ruta a private-key.pem)",
    );
  }
  if (!toSign) {
    throw new Error("Falta el parámetro request a firmar");
  }
  const privateKey = await readFile(keyPath, "utf8");
  const signer = createSign("RSA-SHA512");
  signer.update(toSign);
  signer.end();
  return signer.sign(privateKey, "base64");
}

export async function GET(req: NextRequest) {
  try {
    const toSign = req.nextUrl.searchParams.get("request") || "";
    const signature = await signMessage(toSign);
    return new NextResponse(signature, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new NextResponse(
      `Error al firmar mensaje QZ: ${String((err as Error)?.message || err)}`,
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const toSign = String(
      body?.request || body?.toSign || req.nextUrl.searchParams.get("request") || "",
    );
    const signature = await signMessage(toSign);
    return new NextResponse(signature, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new NextResponse(
      `Error al firmar mensaje QZ: ${String((err as Error)?.message || err)}`,
      { status: 500 },
    );
  }
}
