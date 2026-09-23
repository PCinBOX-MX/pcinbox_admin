import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGO_URL =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

/** Proxy mismo-origen del logo del ticket (evita CORS y falla de ImageKit en el navegador). */
export async function GET() {
  try {
    const res = await fetch(LOGO_URL, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return new NextResponse(`No se pudo obtener el logo (${res.status})`, {
        status: 502,
      });
    }
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    return new NextResponse(
      `Error al cargar logo del ticket: ${String((err as Error)?.message || err)}`,
      { status: 500 },
    );
  }
}
