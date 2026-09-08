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

export async function printRawToQz(
  data: string,
  printerName?: string,
): Promise<void> {
  const qz = await connectQz();
  const printer = requirePrinterName(printerName);
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
  const payload = buildEscPosTicket(sale, {
    openDrawer: Boolean(opts?.openDrawer),
    drawerDialect: settings.drawerDialect,
  });
  await printRawToQz(payload, opts?.printerName);
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
  const msg = String((err as { message?: string })?.message || err || "");
  if (isQzConnectionError(err)) {
    return (
      "No se pudo conectar con QZ Tray. Instálalo en esta PC, ábrelo y " +
      "permite este sitio en Site Manager (o firma mensajes). Luego reintenta."
    );
  }
  return msg || "Error al hablar con la impresora.";
}
