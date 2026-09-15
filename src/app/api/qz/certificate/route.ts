import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveQzCertPath } from "../qzPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const certPath = resolveQzCertPath();
    const cert = await readFile(certPath, "utf8");
    return new NextResponse(cert, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new NextResponse(
      `No se pudo leer el certificado QZ (${resolveQzCertPath()}): ${String(
        (err as Error)?.message || err,
      )}. Copia digital-certificate.txt a la carpeta qz-certs/ del admin (ver qz-certs/README.md).`,
      { status: 500 },
    );
  }
}
