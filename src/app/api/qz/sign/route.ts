import { createSign } from "crypto";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { resolveQzPrivateKeyPath } from "../qzPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function signMessage(toSign: string): Promise<string> {
  if (!toSign) {
    throw new Error("Falta el parámetro request a firmar");
  }
  const keyPath = resolveQzPrivateKeyPath();
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
      `Error al firmar mensaje QZ (${resolveQzPrivateKeyPath()}): ${String(
        (err as Error)?.message || err,
      )}. Copia private-key.pem a la carpeta qz-certs/ del admin (ver qz-certs/README.md).`,
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const toSign = String(
      body?.request ||
        body?.toSign ||
        req.nextUrl.searchParams.get("request") ||
        "",
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
      `Error al firmar mensaje QZ (${resolveQzPrivateKeyPath()}): ${String(
        (err as Error)?.message || err,
      )}. Copia private-key.pem a la carpeta qz-certs/ del admin (ver qz-certs/README.md).`,
      { status: 500 },
    );
  }
}
