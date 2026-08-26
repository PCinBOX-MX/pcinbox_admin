"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
} from "@mui/material";
import {
  MdAutorenew,
  MdCloudUpload,
  MdDownload,
  MdExpandLess,
  MdExpandMore,
} from "react-icons/md";
import { Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useTheContext } from "@/app/hooks/global.hook";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import useProveedores from "@/app/proveedores/useProveedores";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import { takeFilesWithinLimit } from "@/app/constants/productImages.constants";
import {
  getProviderLabel,
  PROVIDER_PCINBOX,
  PROVIDER_TECHSMART,
  providerUsesProfitMargin,
} from "@/app/constants/providers.constants";
import styles from "./bulkUploadProvider.module.css";

type BulkRow = {
  upc: string;
  idProductExt: string;
  description: string;
  margin: number;
  price: number | null;
  characteristics: string;
  providerId: number;
  imageUrls: string[];
  matchedProduct: ProductsI | null;
  files: File[];
  imageError: string | null;
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
};

type Props = {
  defaultProviderId?: number;
};

function normalizeKeys(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  Object.keys(row).forEach((k) => {
    out[k.trim().toLowerCase()] = row[k];
  });
  return out;
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  return undefined;
}

/** Normaliza claves del Excel (UPC / idProductExt): números sin decimales espurios. */
function normalizeExcelKey(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(Math.trunc(raw));
  }
  return String(raw).trim();
}

function normalizeImageUrl(raw: string): string {
  let url = String(raw ?? "").trim();
  if (!url) return "";
  url = url.replace(/^["']+|["']+$/g, "");
  url = url.replace(/\\"/g, '"').replace(/\\'/g, "'");
  if (url.startsWith("//")) return `https:${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[\w-]+\.[\w.-]+/.test(url)) return `https://${url}`;
  return url;
}

/** Clave para deduplicar la misma imagen con URL distinta (query params, CDN, etc.). */
function canonicalImageKey(url: string): string {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return "";
  try {
    const u = new URL(normalized);
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    const name = path.split("/").pop() || path;
    return `${u.hostname.toLowerCase()}${path}|${name}`;
  } catch {
    return normalized.toLowerCase();
  }
}

function dedupeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = normalizeImageUrl(raw);
    if (!url) continue;
    const key = canonicalImageKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function cleanUrlToken(raw: string): string {
  return normalizeImageUrl(
    raw.replace(/^[\s[\('"\\]+|[\s\]'"\)\\]+$/g, ""),
  );
}

function parseImageUrls(raw: unknown): string[] {
  if (raw == null || raw === "") return [];

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const fromObj =
      obj.Target ?? obj.target ?? obj.href ?? obj.url ?? obj.Hyperlink;
    if (fromObj != null) return parseImageUrls(fromObj);
  }

  if (Array.isArray(raw)) {
    return [
      ...new Set(
        raw.flatMap((v) => parseImageUrls(v)).filter(Boolean),
      ),
    ];
  }

  const str = String(raw).trim();
  if (!str) return [];

  if (str.startsWith("[") || str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str) as unknown;
      if (Array.isArray(parsed)) {
        return [
          ...new Set(
            parsed.map((v) => cleanUrlToken(String(v))).filter(Boolean),
          ),
        ];
      }
    } catch {
      try {
        const parsed = JSON.parse(str.replace(/'/g, '"')) as unknown;
        if (Array.isArray(parsed)) {
          return [
            ...new Set(
              parsed.map((v) => cleanUrlToken(String(v))).filter(Boolean),
            ),
          ];
        }
      } catch {
        /* separadores */
      }
    }
  }

  return [
    ...new Set(
      str
        .split(/[,;\n|]+/)
        .map(cleanUrlToken)
        .filter(Boolean),
    ),
  ];
}

function extractCatalogImages(product: ProductsI | null): string[] {
  if (!product?.image_url) return [];
  const raw = product.image_url;
  const list = Array.isArray(raw) ? raw : parseImageUrls(raw);
  return [...new Set(list.map((u) => normalizeImageUrl(String(u))).filter(Boolean))];
}

const IMAGENES_COLUMN_NAMES = [
  "imagenes",
  "imágenes",
  "img_url",
  "image_url",
  "images",
  "imagen",
];

function findImagenesColumnIndex(ws: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })];
    const label = String(cell?.v ?? "")
      .trim()
      .toLowerCase();
    if (IMAGENES_COLUMN_NAMES.includes(label)) return c;
  }
  return -1;
}

/** URLs de celdas con hipervínculo en Excel (el texto visible no siempre es la URL). */
function buildHyperlinkMap(
  ws: XLSX.WorkSheet,
  colIndex: number,
  dataStartRow: number,
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (colIndex < 0) return map;

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let r = dataStartRow; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: colIndex })];
    if (!cell) continue;
    const urls: string[] = [];
    if (cell.l?.Target) {
      const target = normalizeImageUrl(String(cell.l.Target));
      if (target) urls.push(target);
    }
    if (urls.length) map.set(r - dataStartRow, urls);
  }
  return map;
}

/** Igual que UploadImgProvider2: "clave: valor" por línea → { prop, value } */
function parseCharacteristics(text: string) {
  if (!text) return [] as { prop: string; value: string }[];
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let prop = "";
      let value = "";
      if (line.includes(":")) {
        const parts = line.split(":");
        prop = parts.shift() || "";
        value = parts.join(":");
      } else {
        const match = line.match(/^(.*?)(\d+.*)$/);
        if (match) {
          prop = match[1];
          value = match[2];
        } else {
          prop = line;
        }
      }
      return { prop: prop.trim(), value: value.trim() };
    })
    .filter((item) => item.prop !== "" && item.value !== "");
}

const TEMPLATE_HEADERS = [
  "UPC",
  "idProductExt",
  "Descripcion",
  "Imagenes",
  "Caracteristicas",
  "Margen",
  "Precio",
];

const COLUMN_HINTS = [
  { label: "idProductExt", required: true },
  { label: "UPC", required: false },
  { label: "Imagenes", required: true },
  { label: "Margen", required: true },
  { label: "Precio", required: false },
];

function statusLabel(status: BulkRow["status"]) {
  switch (status) {
    case "uploading":
      return "Subiendo";
    case "success":
      return "OK";
    case "error":
      return "Error";
    default:
      return "Pendiente";
  }
}

function statusClass(status: BulkRow["status"]) {
  switch (status) {
    case "uploading":
      return styles.statusUploading;
    case "success":
      return styles.statusSuccess;
    case "error":
      return styles.statusError;
    default:
      return styles.statusPending;
  }
}

const PRODUCT_IMAGE_FALLBACK = "/imagen-no-encontrada.png";

/** Vista previa vía proxy del admin: evita bloqueo hotlink en el navegador. */
function resolvePreviewSrc(src: string): string {
  if (!src) return PRODUCT_IMAGE_FALLBACK;
  if (src.startsWith("blob:") || src.startsWith("/")) return src;
  return `/api/preview-image?url=${encodeURIComponent(src)}`;
}

function BulkImageThumb({
  src,
  rowIndex,
  index,
  removable,
  onRemove,
}: {
  src: string;
  rowIndex: number;
  index: number;
  removable: boolean;
  onRemove?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const previewSrc = failed ? PRODUCT_IMAGE_FALLBACK : resolvePreviewSrc(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={styles.thumb}
      data-testid={`bulk-image-${rowIndex}-${index}`}
      title={src}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewSrc}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      {removable && onRemove ? (
        <button
          type="button"
          className={styles.thumbRemove}
          data-testid={`bulk-remove-image-${rowIndex}-${index}`}
          onClick={onRemove}
          aria-label="Quitar imagen"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

function BulkRowImagesCompact({
  files,
  imageUrls,
  catalogUrls = [],
  error,
  onAddFiles,
  onRemove,
  rowIndex,
}: {
  files: File[];
  imageUrls: string[];
  catalogUrls?: string[];
  error: string | null;
  onAddFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  rowIndex: number;
}) {
  const [blobUrls, setBlobUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setBlobUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const normalizedExcel = useMemo(
    () => dedupeImageUrls(imageUrls),
    [imageUrls],
  );
  const normalizedCatalog = useMemo(() => {
    if (normalizedExcel.length > 0) return [];
    const excelKeys = new Set(normalizedExcel.map(canonicalImageKey));
    return dedupeImageUrls(catalogUrls).filter(
      (u) => !excelKeys.has(canonicalImageKey(u)),
    );
  }, [catalogUrls, normalizedExcel]);

  const previewItems = useMemo(
    () => [
      ...normalizedExcel.map((url) => ({
        url,
        kind: "excel" as const,
      })),
      ...blobUrls.map((url) => ({
        url,
        kind: "file" as const,
      })),
      ...normalizedCatalog.map((url) => ({
        url,
        kind: "catalog" as const,
      })),
    ],
    [normalizedExcel, blobUrls, normalizedCatalog],
  );

  return (
    <div className={styles.imagesSection}>
      <span className={styles.imagesLabel}>
        Imágenes
        {previewItems.length > 0 ? ` · ${previewItems.length} en vista previa` : ""}
        {normalizedExcel.length > 0
          ? ` (${normalizedExcel.length} del Excel)`
          : null}
        {normalizedCatalog.length > 0 && normalizedExcel.length === 0
          ? ` (${normalizedCatalog.length} del catálogo)`
          : null}
      </span>
      {previewItems.length > 0 ? (
        <div className={styles.imageStrip} data-testid={`bulk-product-images-${rowIndex}`}>
          {previewItems.map((item, index) => (
            <BulkImageThumb
              key={`${item.kind}-${item.url}-${index}`}
              src={item.url}
              rowIndex={rowIndex}
              index={index}
              removable={item.kind !== "catalog"}
              onRemove={
                item.kind === "catalog"
                  ? undefined
                  : () => onRemove(index)
              }
            />
          ))}
          <label
            className={styles.addImageBtn}
            data-testid={`bulk-file-trigger-${rowIndex}`}
            title="Agregar imágenes"
          >
            <MdCloudUpload size={22} />
            <input
              data-testid={`bulk-file-input-${rowIndex}`}
              type="file"
              hidden
              multiple
              accept="image/*,video/*"
              onChange={(event) => {
                const selected = Array.from(
                  (event.target as HTMLInputElement).files || [],
                );
                if (selected.length) onAddFiles(selected);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      ) : (
        <label
          className={styles.addImageBtnWide}
          data-testid={`bulk-file-trigger-${rowIndex}`}
          title="Agregar imágenes"
        >
          <MdCloudUpload size={22} />
          <span>Subir imágenes</span>
          <input
            data-testid={`bulk-file-input-${rowIndex}`}
            type="file"
            hidden
            multiple
            accept="image/*,video/*"
            onChange={(event) => {
              const selected = Array.from(
                (event.target as HTMLInputElement).files || [],
              );
              if (selected.length) onAddFiles(selected);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {error ? (
        <span className={styles.imageError} data-testid={`bulk-image-error-${rowIndex}`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function RowCharacteristics({
  text,
  expanded,
  onToggle,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const chars = parseCharacteristics(text);
  if (!chars.length) return null;

  const preview = chars.slice(0, 3);
  const rest = chars.length - preview.length;

  return (
    <div>
      <button type="button" className={styles.charsToggle} onClick={onToggle}>
        {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
        {expanded
          ? "Ocultar características"
          : `${chars.length} característica${chars.length === 1 ? "" : "s"}`}
      </button>
      {!expanded && rest > 0 ? (
        <div className={styles.charsList}>
          {preview.map((c, i) => (
            <span key={i} className={styles.charTag} title={`${c.prop}: ${c.value}`}>
              {c.prop}
              {c.value ? `: ${c.value}` : ""}
            </span>
          ))}
          <span className={styles.charTag}>+{rest} más</span>
        </div>
      ) : null}
      {expanded ? (
        <div className={styles.charsList}>
          {chars.map((c, i) => (
            <span key={i} className={styles.charTag} title={`${c.prop}: ${c.value}`}>
              {c.prop}
              {c.value ? `: ${c.value}` : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function BulkUploadProvider({ defaultProviderId }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [bulkData, setBulkData] = useState<BulkRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [expandedChars, setExpandedChars] = useState<Set<number>>(new Set());

  const { setDataModal } = useTheContext();
  const { setProductsProveedor } = useProveedores();
  const { requestPostProveedores } = ProveedoresUtils();

  // Aviso nativo del navegador si intentan recargar/cerrar pestaña mid-import.
  useEffect(() => {
    if (!isUploading) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        "La importación sigue en curso. Si sales ahora se interrumpirá.";
      return event.returnValue;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isUploading]);

  // Bloquea la X / Escape / backdrop del ModalComponent global.
  useEffect(() => {
    setDataModal((prev) =>
      prev.loading === isUploading ? prev : { ...prev, loading: isUploading },
    );
  }, [isUploading, setDataModal]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      [
        "7501234567890",
        "ABC-123",
        "Impresora HP LaserJet",
        '["https://ejemplo.com/img1.jpg","https://ejemplo.com/img2.jpg"]',
        "Marca: HP\nModelo: LaserJet\nColor: Negro",
        350,
        1250.5,
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alta masiva");
    XLSX.writeFile(wb, "plantilla-alta-productos.xlsx");
  };

  const lookupProducts = async (rows: BulkRow[]): Promise<BulkRow[]> => {
    const fallback = Number(defaultProviderId) || 0;
    const groups = new Map<
      number,
      { idProductExts: string[]; upcs: string[] }
    >();

    for (const row of rows) {
      const pid = row.providerId || fallback;
      if (!pid) continue;
      const group = groups.get(pid) ?? { idProductExts: [], upcs: [] };
      if (row.idProductExt) {
        group.idProductExts.push(row.idProductExt);
      } else if (row.upc) {
        group.upcs.push(row.upc);
      }
      groups.set(pid, group);
    }

    const map = new Map<string, ProductsI | null>();

    for (const [providerId, { idProductExts, upcs }] of groups) {
      const uniqueExts = [...new Set(idProductExts.filter(Boolean))];
      const uniqueUpcs = [...new Set(upcs.filter(Boolean))];
      if (!uniqueExts.length && !uniqueUpcs.length) continue;

      const res = await requestPostProveedores(
        {
          providerId,
          idProductExts: uniqueExts,
          upcs: uniqueUpcs,
        },
        "/lookupProductsByUpc",
        { silent: true },
      );
      const data = (res?.data?.data ?? {}) as Record<string, ProductsI | null>;
      for (const [key, product] of Object.entries(data)) {
        map.set(`${providerId}:${key}`, product);
        if (product?.upc) {
          map.set(`${providerId}:${String(product.upc)}`, product);
        }
        if (product?.idProductExt) {
          map.set(`${providerId}:${String(product.idProductExt)}`, product);
        }
      }
    }

    return rows.map((row) => {
      const pid = row.providerId || fallback;
      const byExt = row.idProductExt
        ? map.get(`${pid}:${row.idProductExt}`)
        : null;
      const byUpc = row.upc ? map.get(`${pid}:${row.upc}`) : null;
      const matchedProduct = byExt ?? byUpc ?? null;
      const imageUrls =
        row.imageUrls.length > 0
          ? row.imageUrls
          : extractCatalogImages(matchedProduct);
      return { ...row, matchedProduct, imageUrls };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      void (async () => {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        const imgColIndex = findImagenesColumnIndex(ws);
        const hyperlinkMap = buildHyperlinkMap(ws, imgColIndex, range.s.r + 1);

        const parsed: BulkRow[] = rows.map((row, rowIndex) => {
          const r = normalizeKeys(row);
          const priceRaw = pick(r, [
            "precio",
            "precio proveedor",
            "originprice",
            "precio_proveedor",
          ]);
          const priceNum =
            priceRaw == null || String(priceRaw).trim() === ""
              ? null
              : Number(priceRaw);

          const fromCell = parseImageUrls(pick(r, IMAGENES_COLUMN_NAMES));
          const fromLinks = hyperlinkMap.get(rowIndex) ?? [];
          const imageUrls = dedupeImageUrls([
            ...fromCell,
            ...fromLinks,
          ]);

          return {
            upc: normalizeExcelKey(pick(r, ["upc"])),
            idProductExt: normalizeExcelKey(
              pick(r, [
                "idproductext",
                "id_product_ext",
                "clave",
                "idproductoext",
              ]),
            ),
            description: String(
              pick(r, ["descripcion", "descripción", "description"]) ?? "",
            ),
            margin: Number(
              pick(r, [
                "margen",
                "margen de utilidad",
                "margen de utilidad",
                "margin",
                "profitmargin",
              ]) ?? 0,
            ),
            price: Number.isFinite(priceNum as number) ? priceNum : null,
            characteristics: String(
              pick(r, [
                "caracteristicas",
                "características",
                "characteristics",
              ]) ?? "",
            ),
            providerId:
              Number(
                pick(r, ["providerid", "provider id", "idproveedor"]) ??
                  defaultProviderId ??
                  0,
              ) ||
              Number(defaultProviderId) ||
              0,
            imageUrls,
            matchedProduct: null,
            files: [],
            imageError: null,
            status: "pending",
          };
        });

        setIsMatching(true);
        try {
          setBulkData(await lookupProducts(parsed));
          setStep(2);
        } finally {
          setIsMatching(false);
        }
      })();
    };
    reader.readAsBinaryString(file);
  };

  const handleAddFiles = (index: number, incoming: File[]) => {
    setBulkData((prev) => {
      const next = [...prev];
      const cur = next[index];
      const { accepted, error } = takeFilesWithinLimit(
        cur.files.length + cur.imageUrls.length,
        incoming,
      );
      next[index] = {
        ...cur,
        files: accepted.length ? [...cur.files, ...accepted] : cur.files,
        imageError: error,
      };
      return next;
    });
  };

  const handleRemoveFile = (prodIndex: number, previewIndex: number) => {
    setBulkData((prev) => {
      const next = [...prev];
      const row = next[prodIndex];
      const urlCount = row.imageUrls.length;
      if (previewIndex < urlCount) {
        next[prodIndex] = {
          ...row,
          imageUrls: row.imageUrls.filter((_, i) => i !== previewIndex),
          imageError: null,
        };
      } else {
        const fileIndex = previewIndex - urlCount;
        next[prodIndex] = {
          ...row,
          files: row.files.filter((_, i) => i !== fileIndex),
          imageError: null,
        };
      }
      return next;
    });
  };

  const rowHasImages = (row: BulkRow) =>
    row.imageUrls.length > 0 ||
    row.files.length > 0 ||
    extractCatalogImages(row.matchedProduct).length > 0;

  const canSubmitRow = (row: BulkRow) =>
    Boolean(row.matchedProduct) &&
    row.status !== "success" &&
    rowHasImages(row);

  const handleBulkSubmit = async () => {
    const valid = bulkData.filter(canSubmitRow);
    if (!valid.length) return;

    setIsUploading(true);
    setProgress({ current: 0, total: valid.length });
    let successCount = 0;

    try {
      for (let i = 0; i < bulkData.length; i++) {
        const item = bulkData[i];
        if (!canSubmitRow(item)) continue;

        setBulkData((prev) => {
          const d = [...prev];
          d[i] = { ...d[i], status: "uploading" };
          return d;
        });

        const catalog = item.matchedProduct!;
        const providerId = Number(
          item.providerId || catalog.providerId || defaultProviderId,
        );
        const parsedChars = parseCharacteristics(item.characteristics);

        // Mismo FormData que UploadImgProvider2 → POST /newProductPcinbox
        const formData = new FormData();
        formData.append(
          "clave",
          String(catalog.idProductExt || item.idProductExt || item.upc),
        );
        formData.append("name", catalog.name);
        formData.append(
          "description",
          item.description || catalog.description || "",
        );

        if (providerId === PROVIDER_PCINBOX) {
          formData.append("newPrice", String(item.price ?? catalog.price ?? 0));
        } else {
          formData.append("newPrice", String(catalog.price ?? 0));
        }

        formData.append(
          "originPrice",
          String(item.price ?? catalog.originPriceMxn ?? catalog.price ?? 0),
        );

        if (providerUsesProfitMargin(providerId)) {
          formData.append("profitMargin", String(item.margin));
        }

        if (providerId === PROVIDER_TECHSMART) {
          formData.append("isDolares", String(Boolean(catalog.isDolares)));
          formData.append("originPriceMxn", "true");
        }

        formData.append("sku", catalog.sku || "");
        formData.append("stock", String(catalog.stock ?? 0));
        formData.append("providerId", String(providerId));
        formData.append("nameMarca", catalog.nameMarca || "");
        formData.append("nameCategory", catalog.nameCategory || "");
        formData.append("isPc", "false");
        formData.append("caracteristicas", JSON.stringify(parsedChars));
        formData.append("upc", String(catalog.upc ?? item.upc));
        formData.append("width", String(catalog.width ?? ""));
        formData.append("height", String(catalog.height ?? ""));
        formData.append("length", String(catalog.largo ?? ""));
        formData.append("branches", JSON.stringify(catalog.branches || []));
        formData.append("peso", catalog.peso?.toString() ?? "null");

        if (item.imageUrls.length > 0) {
          formData.append("imageUrls", JSON.stringify(item.imageUrls));
        } else {
          const catalogUrls = extractCatalogImages(catalog);
          if (catalogUrls.length > 0) {
            formData.append("imageUrls", JSON.stringify(catalogUrls));
          }
        }
        item.files.forEach((f) => formData.append("files", f));

        try {
          const resp = await requestPostProveedores(
            formData,
            "/newProductPcinbox",
          );

          if (resp.status === 200) {
            successCount++;
            const data = resp?.data?.data;
            setProductsProveedor((prev) => {
              const updateItem = (prevItem: ProductsI) => {
                if (prevItem.idProductExt == data?.data?.idProductExt) {
                  return {
                    ...prevItem,
                    ...data?.data,
                    idProduct: Number(data?.data?.idProduct),
                  };
                }
                return prevItem;
              };
              return {
                ...prev,
                data: prev.data.map(updateItem),
                copyData: prev.copyData!.map(updateItem),
              };
            });
            setBulkData((prev) => {
              const d = [...prev];
              d[i] = { ...d[i], status: "success" };
              return d;
            });
          } else {
            setBulkData((prev) => {
              const d = [...prev];
              d[i] = {
                ...d[i],
                status: "error",
                errorMsg: resp?.data?.message || "Error en respuesta",
              };
              return d;
            });
          }
        } catch {
          setBulkData((prev) => {
            const d = [...prev];
            d[i] = {
              ...d[i],
              status: "error",
              errorMsg: "Error de conexión o imágenes inválidas",
            };
            return d;
          });
        }

        setProgress((p) => ({ ...p, current: p.current + 1 }));
      }
    } finally {
      // Siempre quitar loading: 200, 4xx/5xx, red o throw inesperado.
      setIsUploading(false);
      setDataModal((prev) =>
        prev.loading ? { ...prev, loading: false } : prev,
      );
    }

    const failed = valid.length - successCount;
    setDataModal({
      isOpen: true,
      loading: false,
      type: successCount === 0 ? "error" : failed > 0 ? "warning" : "success",
      content:
        successCount === 0
          ? `No se pudo dar de alta ningún producto (${valid.length} fallaron).`
          : failed > 0
            ? `Se dieron de alta ${successCount} de ${valid.length}. ${failed} fallaron.`
            : `Se dieron de alta ${successCount} productos.`,
      showActions: true,
      title:
        successCount === 0
          ? "Proceso con errores"
          : failed > 0
            ? "Proceso parcial"
            : "Proceso terminado",
      onClose: () =>
        setDataModal((p) => ({ ...p, isOpen: false, loading: false })),
      onConfirm: () =>
        setDataModal((p) => ({ ...p, isOpen: false, loading: false })),
    });
  };

  const reviewStats = useMemo(() => {
    const matched = bulkData.filter((r) => r.matchedProduct).length;
    const ready = bulkData.filter(canSubmitRow).length;
    const done = bulkData.filter((r) => r.status === "success").length;
    return { matched, ready, done, total: bulkData.length };
  }, [bulkData]);

  const toggleChars = (idx: number) => {
    setExpandedChars((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className={styles.root}>
      {step === 1 && (
        <div className={styles.uploadStep}>
          {defaultProviderId ? (
            <span className={styles.providerBadge}>
              Proveedor: {getProviderLabel(defaultProviderId)}
            </span>
          ) : null}

          <label
            className={`${styles.dropzone} ${isMatching ? styles.dropzoneDisabled : ""}`}
          >
            <div className={styles.dropzoneIcon}>
              {isMatching ? (
                <CircularProgress size={28} sx={{ color: "#992230" }} />
              ) : (
                <MdCloudUpload size={28} />
              )}
            </div>
            <p className={styles.dropzoneTitle}>
              {isMatching
                ? "Buscando productos en catálogo…"
                : "Arrastra o selecciona tu Excel"}
            </p>
            <p className={styles.dropzoneHint}>
              Alta masiva equivalente a &quot;Dar de alta al sistema&quot;. Un
              archivo por proveedor; se busca por <strong>idProductExt</strong>.
            </p>
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv"
              disabled={isMatching}
              onChange={handleFileUpload}
              onClick={(ev) => {
                (ev.target as HTMLInputElement).value = "";
              }}
            />
          </label>

          <div className={styles.columnChips}>
            {COLUMN_HINTS.map((col) => (
              <span
                key={col.label}
                className={`${styles.columnChip} ${col.required ? styles.columnChipRequired : ""}`}
              >
                {col.label}
                {col.required ? " *" : ""}
              </span>
            ))}
          </div>

          <Button
            className={styles.templateBtn}
            variant="text"
            startIcon={<MdDownload />}
            onClick={downloadTemplate}
            sx={{ color: "#992230", fontWeight: 600, textTransform: "none" }}
          >
            Descargar plantilla .xlsx
          </Button>
        </div>
      )}

      {step === 2 && (
        <>
          <div className={styles.reviewHeader}>
            <div>
              <h3 className={styles.reviewTitle}>Revisión antes del alta</h3>
              <p className={styles.reviewSubtitle}>
                Confirma datos e imágenes. Los botones permanecen fijos abajo.
              </p>
            </div>
            <div className={styles.stats}>
              <span className={`${styles.stat} ${styles.statTotal}`}>
                {reviewStats.total} filas
              </span>
              <span className={`${styles.stat} ${styles.statOk}`}>
                {reviewStats.matched} en catálogo
              </span>
              <span className={`${styles.stat} ${styles.statPending}`}>
                {reviewStats.ready} listos
              </span>
              {reviewStats.done > 0 ? (
                <span className={`${styles.stat} ${styles.statDone}`}>
                  {reviewStats.done} completados
                </span>
              ) : null}
            </div>
          </div>

          <div className={styles.scrollArea}>
            {bulkData.map((row, idx) => {
              const providerLabel = getProviderLabel(
                row.providerId ||
                  row.matchedProduct?.providerId ||
                  defaultProviderId,
              );
              const cardClass = [
                styles.rowCard,
                row.status === "success" ? styles.rowCardSuccess : "",
                row.status === "error" ? styles.rowCardError : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <article key={idx} className={cardClass}>
                  <header className={styles.rowCardHeader}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowIndex}>#{idx + 1}</span>
                      <h4
                        className={`${styles.rowName} ${!row.matchedProduct ? styles.rowNameMissing : ""}`}
                      >
                        {row.matchedProduct?.name ?? "No encontrado en catálogo"}
                      </h4>
                      {row.idProductExt ? (
                        <code className={styles.rowClave}>{row.idProductExt}</code>
                      ) : null}
                      {row.upc ? (
                        <code className={styles.rowClave}>UPC {row.upc}</code>
                      ) : null}
                    </div>
                    <span
                      className={`${styles.statusChip} ${statusClass(row.status)}`}
                    >
                      {row.status === "uploading" ? (
                        <MdAutorenew className="the-spinner" size={12} />
                      ) : null}{" "}
                      {statusLabel(row.status)}
                    </span>
                  </header>

                  <div className={styles.rowBody}>
                    <div className={styles.metaGrid}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Proveedor</span>
                        <span className={styles.metaValue}>{providerLabel}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Margen</span>
                        <span className={styles.metaValue}>{row.margin}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Precio</span>
                        <span className={styles.metaValue}>
                          {row.price != null ? `$${row.price}` : "—"}
                        </span>
                      </div>
                    </div>

                    {row.characteristics ? (
                      <RowCharacteristics
                        text={row.characteristics}
                        expanded={expandedChars.has(idx)}
                        onToggle={() => toggleChars(idx)}
                      />
                    ) : null}

                    {row.matchedProduct && row.status !== "success" ? (
                      <BulkRowImagesCompact
                        rowIndex={idx}
                        files={row.files}
                        imageUrls={row.imageUrls}
                        catalogUrls={
                          row.imageUrls.length > 0
                            ? []
                            : extractCatalogImages(row.matchedProduct)
                        }
                        error={
                          row.imageError ||
                          (!rowHasImages(row)
                            ? "Agrega imágenes en el Excel o sube archivos"
                            : null)
                        }
                        onAddFiles={(incoming) => handleAddFiles(idx, incoming)}
                        onRemove={(fi) => handleRemoveFile(idx, fi)}
                      />
                    ) : null}

                    {row.status === "error" && row.errorMsg ? (
                      <Typography variant="caption" color="error.main">
                        {row.errorMsg}
                      </Typography>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {isUploading ? (
            <div className={styles.progressBanner}>
              <p className={styles.progressTitle}>
                Importación en curso — no cierres ni recargues
              </p>
              <LinearProgress
                variant="determinate"
                value={
                  progress.total
                    ? (progress.current / progress.total) * 100
                    : 0
                }
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#ffedd5",
                  "& .MuiLinearProgress-bar": { bgcolor: "#ea580c" },
                }}
              />
              <p className={styles.progressHint}>
                Subiendo {progress.current} de {progress.total}
              </p>
            </div>
          ) : null}

          <div className={styles.footer}>
            <Button
              className={styles.footerBtnSecondary}
              color="inherit"
              variant="outlined"
              disabled={isUploading}
              onClick={() => {
                setStep(1);
                setBulkData([]);
                setExpandedChars(new Set());
              }}
              sx={{ borderColor: "#d1d5db", color: "#374151" }}
            >
              Cambiar Excel
            </Button>
            <Button
              className={styles.footerBtnPrimary}
              variant="contained"
              disabled={isUploading || !bulkData.some(canSubmitRow)}
              onClick={() => void handleBulkSubmit()}
              startIcon={
                isUploading ? (
                  <MdAutorenew className="the-spinner" />
                ) : (
                  <MdCloudUpload />
                )
              }
              sx={{ bgcolor: "#bb3d4b", "&:hover": { bgcolor: "#992230" } }}
            >
              Dar de alta todos ({reviewStats.ready})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
