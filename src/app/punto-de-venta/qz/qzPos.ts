"use client";

import type { PosSale } from "../../interfaces/pos/pos.interface";
import { buildEscPosTicket, drawerKickBytes } from "./escposTicket";
import { loadQzSettings, type QzDrawerDialect } from "./qzSettings";

type QzApi = {
  websocket: {
    isActive: () => boolean;
    connect: (opts?: { retries?: number; delay?: number }) => Promise<void>;
    disconnect: () => Promise<void>;
  };
  printers: {
    find: (query?: string) => Promise<string | string[]>;
    getDefault?: () => Promise<string>;
  };
  configs: {
    create: (printer: string, opts?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: unknown[]) => Promise<void>;
  security?: {
    setCertificatePromise: (
      fn: (
        resolve: (v: string) => void,
        reject: (e: unknown) => void,
      ) => void,
    ) => void;
    setSignatureAlgorithm?: (alg: string) => void;
    setSignaturePromise: (
      fn: (
        toSign: string,
      ) => (
        resolve: (v: string) => void,
        reject: (e: unknown) => void,
      ) => void,
    ) => void;
  };
};

let qzPromise: Promise<QzApi> | null = null;
let securityConfigured = false;

async function getQz(): Promise<QzApi> {
  if (!qzPromise) {
    qzPromise = import("qz-tray").then((mod) => {
      const qz =
        (mod as { default?: QzApi }).default || (mod as unknown as QzApi);
      return qz;
    });
  }
  return qzPromise;
}

function configureQzSecurity(qz: QzApi) {
  if (securityConfigured || !qz.security) return;
  securityConfigured = true;

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch("/api/qz/certificate", { cache: "no-store" })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(text || "No se pudo cargar el certificado QZ");
        resolve(text);
      })
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm?.("SHA512");
  qz.security.setSignaturePromise((toSign) => {
    return (resolve, reject) => {
      fetch(`/api/qz/sign?request=${encodeURIComponent(toSign)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          const text = await res.text();
          if (!res.ok) throw new Error(text || "No se pudo firmar el mensaje QZ");
          resolve(text);
        })
        .catch(reject);
    };
  });
}

export async function connectQz(): Promise<QzApi> {
  const qz = await getQz();
  configureQzSecurity(qz);
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 3, delay: 1 });
  }
  return qz;
}

export async function listQzPrinters(): Promise<string[]> {
  const qz = await connectQz();
  const found = await qz.printers.find();
  if (Array.isArray(found)) return found.map(String);
  if (found) return [String(found)];
  return [];
}

function requirePrinterName(name?: string): string {
  const settings = loadQzSettings();
  const printer = (name || settings.printerName || "").trim();
  if (!printer) {
    throw new Error(
      "Elige una impresora en la pestaña Caja (sección Impresora / QZ Tray).",
    );
  }
  return printer;
}

/**
 * Impresoras virtuales / PDF: no entienden ESC/POS.
 * Si se les manda raw, Windows/QZ genera un .pdf vacío o corrupto
 * (p. ej. "QZ Tray Raw Print.pdf").
 */
export function isQzPdfOrVirtualPrinter(printerName?: string | null): boolean {
  const n = String(printerName || "").toLowerCase();
  if (!n) return false;
  return /pdf|xps|onenote|fax|document writer|microsoft print to|send to|raw print|adobe pdf|foxit|nitro/i.test(
    n,
  );
}

export class QzPdfPrinterError extends Error {
  constructor(printerName: string) {
    super(
      `«${printerName}» es una impresora PDF/virtual. El ticket térmico (ESC/POS) no genera un PDF válido. ` +
        `Elige la impresora térmica real, o usa «Vista previa HTML» e imprime/guarda PDF desde el navegador.`,
    );
    this.name = "QzPdfPrinterError";
  }
}

export async function printRawToQz(
  data: string,
  printerName?: string,
): Promise<void> {
  const qz = await connectQz();
  const printer = requirePrinterName(printerName);
  if (isQzPdfOrVirtualPrinter(printer)) {
    throw new QzPdfPrinterError(printer);
  }
  const config = qz.configs.create(printer);
  await qz.print(config, [
    {
      type: "raw",
      format: "plain",
      data,
    },
  ]);
}

export async function printPosTicketQz(
  sale: PosSale,
  opts?: { openDrawer?: boolean; printerName?: string },
): Promise<void> {
  const settings = loadQzSettings();
  const printer = requirePrinterName(opts?.printerName);
  if (isQzPdfOrVirtualPrinter(printer)) {
    throw new QzPdfPrinterError(printer);
  }

  // Solo ESC/POS raw hacia térmica. Mezclar pixel+raw a PDF virtual rompe el archivo.
  const payload = buildEscPosTicket(sale, {
    openDrawer: Boolean(opts?.openDrawer),
    drawerDialect: settings.drawerDialect,
    logoPrinted: false,
  });
  await printRawToQz(payload, printer);
}

export async function openCashDrawerQz(opts?: {
  printerName?: string;
  dialect?: QzDrawerDialect;
}): Promise<void> {
  const settings = loadQzSettings();
  const dialect = opts?.dialect || settings.drawerDialect;
  await printRawToQz(drawerKickBytes(dialect), opts?.printerName);
}

export function isQzConnectionError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || "");
  return /qz|websocket|connect|refuse|ECONNREFUSED|Unable to establish/i.test(
    msg,
  );
}

export function qzErrorMessage(err: unknown): string {
  if (err instanceof QzPdfPrinterError) return err.message;
  const msg = String((err as { message?: string })?.message || err || "");
  if (/QzPdfPrinterError|PDF\/virtual|ESC\/POS/i.test(msg)) return msg;
  if (isQzConnectionError(err)) {
    return (
      "No se pudo conectar con QZ Tray. Instálalo en esta PC, ábrelo y " +
      "permite este sitio en Site Manager (o firma mensajes). Luego reintenta."
    );
  }
  return msg || "Error al hablar con la impresora.";
}
