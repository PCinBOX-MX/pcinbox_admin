import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 8 * 1024 * 1024;

function isAllowedPreviewUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;

    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }

    if (
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url || !isAllowedPreviewUrl(url)) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "image/*,video/*,*/*",
        "User-Agent": "PCInbox-Admin-Preview/1.0",
      },
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "No se pudo descargar la imagen" },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";

    if (
      !contentType.startsWith("image/") &&
      !contentType.startsWith("video/")
    ) {
      return NextResponse.json(
        { error: "El recurso no es una imagen" },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Imagen demasiado grande" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener la imagen" },
      { status: 502 },
    );
  }
}
