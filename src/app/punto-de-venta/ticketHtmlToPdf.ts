import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const LOGO_URL =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`Timeout: ${label}`));
    }, ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function logoToDataUrl(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const kill = window.setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(LOGO_URL, {
      mode: "cors",
      cache: "force-cache",
      signal: ctrl.signal,
    });
    window.clearTimeout(kill);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fixLogoBox(img: HTMLImageElement, maxPx = 72) {
  const nw = img.naturalWidth || maxPx;
  const nh = img.naturalHeight || maxPx;
  const ratio = nw / Math.max(nh, 1);
  if (ratio >= 1) {
    img.style.width = `${maxPx}px`;
    img.style.height = `${Math.round(maxPx / ratio)}px`;
  } else {
    img.style.height = `${maxPx}px`;
    img.style.width = `${Math.round(maxPx * ratio)}px`;
  }
  img.style.maxWidth = `${maxPx}px`;
  img.style.maxHeight = `${maxPx}px`;
  img.style.objectFit = "contain";
  img.style.display = "block";
  img.style.marginLeft = "auto";
  img.style.marginRight = "auto";
}

async function renderTicketCanvas(html: string): Promise<HTMLCanvasElement> {
  const logoDataPromise = logoToDataUrl();

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:392px;height:800px;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("No se pudo preparar la vista del ticket.");

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise<void>((r) => window.setTimeout(r, 20));

    const ticket = doc.querySelector(".ticket") as HTMLElement | null;
    if (!ticket) throw new Error("El ticket no tiene el formato esperado.");

    ticket.querySelector(".actions")?.remove();
    ticket.style.boxShadow = "none";
    ticket.style.borderRadius = "0";
    ticket.style.border = "0";
    ticket.style.maxWidth = "360px";
    ticket.style.width = "360px";
    ticket.style.margin = "0";
    ticket.style.background = "#fff";

    const brandImg = ticket.querySelector(
      ".brand img",
    ) as HTMLImageElement | null;
    if (brandImg) {
      const logoData = await logoDataPromise;
      if (logoData) {
        brandImg.src = logoData;
        await new Promise<void>((resolve) => {
          if (brandImg.complete && brandImg.naturalWidth > 0) {
            resolve();
            return;
          }
          brandImg.onload = () => resolve();
          brandImg.onerror = () => resolve();
          window.setTimeout(resolve, 400);
        });
      }
      if (brandImg.naturalWidth > 0) fixLogoBox(brandImg, 72);
    }

    iframe.style.height = `${Math.max(ticket.scrollHeight + 24, 360)}px`;

    return await html2canvas(ticket, {
      scale: 1.25,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 800,
      removeContainer: true,
      width: 360,
      windowWidth: 392,
    });
  } finally {
    iframe.remove();
  }
}

/**
 * Convierte el HTML del ticket POS en PDF. Falla rápido si la captura se cuelga.
 */
export async function ticketHtmlToPdfBlob(html: string): Promise<Blob> {
  const canvas = await withTimeout(
    renderTicketCanvas(html),
    5000,
    "captura del ticket",
  );

  const imgData = canvas.toDataURL("image/jpeg", 0.9);
  const pdfWidthMm = 90;
  const pdfHeightMm = (canvas.height / canvas.width) * pdfWidthMm;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pdfWidthMm, Math.max(pdfHeightMm, 40)],
    compress: true,
  });
  pdf.addImage(
    imgData,
    "JPEG",
    0,
    0,
    pdfWidthMm,
    pdfHeightMm,
    undefined,
    "FAST",
  );
  return pdf.output("blob");
}
