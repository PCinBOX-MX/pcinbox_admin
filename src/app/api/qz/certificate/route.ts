import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const certPath = process.env.QZ_CERT_PATH;
    if (!certPath) {
      return new NextResponse(
        "Falta QZ_CERT_PATH en .env.local (ruta a digital-certificate.txt)",
        { status: 500 },
      );
    }
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
      `No se pudo leer el certificado QZ: ${String((err as Error)?.message || err)}`,
      { status: 500 },
    );
  }
}
