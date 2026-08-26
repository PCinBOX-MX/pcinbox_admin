"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { MdAutorenew, MdCloudUpload, MdDownload } from "react-icons/md";
import * as XLSX from "xlsx";
import { useTheContext } from "@/app/hooks/global.hook";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import useProveedores from "@/app/proveedores/useProveedores";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import { takeFilesWithinLimit } from "@/app/constants/productImages.constants";
import ProductImagesField from "../productImages/ProductImagesField";
import {
  getProviderLabel,
  PROVIDER_PCINBOX,
  PROVIDER_TECHSMART,
  providerUsesProfitMargin,
} from "@/app/constants/providers.constants";

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

function parseImageUrls(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  const str = String(raw).trim();
  if (!str) return [];
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      /* usar separadores */
    }
  }
  return str
    .split(/[,;\n|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
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

function BulkRowImages({
  files,
  imageUrls,
  error,
  onAddFiles,
  onRemove,
  rowIndex,
}: {
  files: File[];
  imageUrls: string[];
  error: string | null;
  onAddFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  rowIndex: number;
}) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews([...imageUrls, ...urls]);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files, imageUrls]);

  return (
    <Stack spacing={0.75}>
      {imageUrls.length > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {imageUrls.length} URL(s) del Excel
        </Typography>
      ) : null}
      <ProductImagesField
        compact
        previews={previews}
        files={files}
        error={error}
        accept="image/*,video/*"
        inputTestId={`bulk-file-input-${rowIndex}`}
        triggerTestId={`bulk-file-trigger-${rowIndex}`}
        errorTestId={`bulk-image-error-${rowIndex}`}
        imagesTestId={`bulk-product-images-${rowIndex}`}
        imageItemTestIdPrefix={`bulk-image-${rowIndex}`}
        removeTestIdPrefix={`bulk-remove-image-${rowIndex}`}
        onAddFiles={onAddFiles}
        onRemove={onRemove}
      />
    </Stack>
  );
}

export default function BulkUploadProvider({ defaultProviderId }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [bulkData, setBulkData] = useState<BulkRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
      return { ...row, matchedProduct: byExt ?? byUpc ?? null };
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

        const parsed: BulkRow[] = rows.map((row) => {
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
            imageUrls: parseImageUrls(
              pick(r, [
                "imagenes",
                "imágenes",
                "img_url",
                "image_url",
                "images",
                "imagen",
              ]),
            ),
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

  const handleRemoveFile = (prodIndex: number, fileIndex: number) => {
    setBulkData((prev) => {
      const next = [...prev];
      next[prodIndex] = {
        ...next[prodIndex],
        files: next[prodIndex].files.filter((_, i) => i !== fileIndex),
        imageError: null,
      };
      return next;
    });
  };

  const rowHasImages = (row: BulkRow) =>
    row.imageUrls.length > 0 || row.files.length > 0;

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

  return (
    <Stack spacing={3} sx={{ mt: 2, pb: 2, width: "100%" }}>
      {step === 1 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 4,
          }}
        >
          <Typography variant="h6">Sube tu archivo Excel (.xlsx)</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ maxWidth: 560 }}
          >
            Mismo alta que &quot;Dar de alta al sistema&quot;, en lote.
            Columnas: <b>idProductExt</b> (clave principal), <b>UPC</b>{" "}
            (opcional), <b>Descripcion</b>, <b>Imagenes</b> (JSON o URLs
            separadas por coma), <b>Caracteristicas</b> (clave: valor por
            línea), <b>Margen</b>, <b>Precio</b> (precio proveedor). Se busca
            en catálogo/BD por idProductExt; UPC solo si no hay clave. Se usa
            el proveedor del filtro
            {defaultProviderId
              ? ` (${getProviderLabel(defaultProviderId)})`
              : ""}
            .
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            justifyContent="center"
          >
            <Button
              variant="text"
              startIcon={<MdDownload />}
              onClick={downloadTemplate}
            >
              Descargar plantilla
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={
                isMatching ? (
                  <CircularProgress size={18} />
                ) : (
                  <MdCloudUpload />
                )
              }
              disabled={isMatching}
              sx={{
                height: 56,
                borderStyle: "dashed",
                borderWidth: 2,
                px: 4,
              }}
            >
              {isMatching ? "Buscando productos…" : "Seleccionar Excel"}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                onClick={(ev) => {
                  (ev.target as HTMLInputElement).value = "";
                }}
              />
            </Button>
          </Stack>
        </Box>
      )}

      {step === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Revisión ({bulkData.length} filas ·{" "}
            {bulkData.filter((r) => r.matchedProduct).length} en catálogo)
          </Typography>

          <TableContainer
            component={Paper}
            sx={{ maxHeight: "60vh", overflow: "auto" }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ext / UPC</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Margen</TableCell>
                  <TableCell>Precio</TableCell>
                  <TableCell>Características</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>Imágenes</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bulkData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor:
                        row.status === "success" ? "#edf7ed" : "inherit",
                    }}
                  >
                    <TableCell>
                      {row.idProductExt ? (
                        <Typography variant="caption" display="block">
                          {row.idProductExt}
                        </Typography>
                      ) : null}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {row.upc || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getProviderLabel(
                        row.providerId ||
                          row.matchedProduct?.providerId ||
                          defaultProviderId,
                      )}
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 200,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.matchedProduct ? (
                        row.matchedProduct.name
                      ) : (
                        <Typography color="error" variant="caption">
                          No encontrado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.margin}</TableCell>
                    <TableCell>
                      {row.price != null ? row.price : "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220, verticalAlign: "top" }}>
                      <Box
                        sx={{
                          maxHeight: 80,
                          overflow: "auto",
                          fontSize: "0.75rem",
                        }}
                      >
                        {parseCharacteristics(row.characteristics).map(
                          (c, ci) => (
                            <div key={ci}>
                              <b>{c.prop}</b>
                              {c.value ? `: ${c.value}` : ""}
                            </div>
                          ),
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top", py: 1.5 }}>
                      {row.matchedProduct && row.status !== "success" ? (
                        <BulkRowImages
                          rowIndex={idx}
                          files={row.files}
                          imageUrls={row.imageUrls}
                          error={
                            row.imageError ||
                            (!rowHasImages(row)
                              ? "Agrega Imagenes en Excel o sube archivos"
                              : null)
                          }
                          onAddFiles={(incoming) =>
                            handleAddFiles(idx, incoming)
                          }
                          onRemove={(fi) => handleRemoveFile(idx, fi)}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.status === "pending" && (
                        <Typography variant="caption" color="text.secondary">
                          Pendiente
                        </Typography>
                      )}
                      {row.status === "uploading" && (
                        <MdAutorenew
                          className="the-spinner"
                          size={18}
                          color="blue"
                        />
                      )}
                      {row.status === "success" && (
                        <Typography variant="caption" color="success.main">
                          OK
                        </Typography>
                      )}
                      {row.status === "error" && (
                        <Typography variant="caption" color="error.main">
                          {row.errorMsg}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {isUploading && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "#fff7ed",
                border: "1px solid #fdba74",
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: "#9a3412", mb: 1 }}
              >
                Importación en curso — no cierres esta ventana ni recargues el
                navegador
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  progress.total
                    ? (progress.current / progress.total) * 100
                    : 0
                }
              />
              <Typography
                variant="caption"
                align="center"
                display="block"
                sx={{ mt: 1, color: "#9a3412" }}
              >
                Subiendo {progress.current} de {progress.total}. El modal está
                bloqueado hasta terminar.
              </Typography>
            </Box>
          )}

          <Box
            sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            <Button
              color="error"
              variant="outlined"
              disabled={isUploading}
              onClick={() => {
                setStep(1);
                setBulkData([]);
              }}
            >
              Eliminar Excel / Subir otro
            </Button>
            <Button
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
            >
              Dar de Alta Todos
            </Button>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
