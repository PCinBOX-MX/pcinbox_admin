"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircularProgress,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  Banknote,
  History,
  PenLine,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  Eye,
  ExternalLink,
  Shield,
  X,
  FileText,
  FileDown,
  FileX2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Truck,
} from "lucide-react";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import usePermissions from "../hooks/usePermissions";
import {
  POS_CASH_MOVEMENT_LABELS,
  POS_PAYMENT_LABELS,
  POS_PAYMENT_OPTIONS,
  POS_PHYSICAL_CONDITION_PRESETS,
  POS_SERVICE_TYPE_PRESETS,
  formatPosPaymentLabel,
  POS_PHONE_LADAS,
  PosCashMovementType,
  PosPaymentMethod,
  PosProductHit,
  PosSaleStatus,
  PosServiceIntake,
  isPosProductOutOfStock,
} from "../interfaces/pos/pos.interface";
import { formatPosBranchUiLabel } from "../interfaces/pos/posBranchDisplay";
import usePos from "./usePos";
import {
  formatMoney,
  formatPosFolio,
  formatPosSaleDateTime,
  formatQty,
} from "./posFormat";
import PosNumberField from "./PosNumberField";
import {
  posWarrantySelectable,
  warrantyCoverageLabel,
} from "./posWarranty";
import CatalogWarrantyFields from "../shared/components/especific/CatalogWarrantyFields";
import {
  CatalogWarrantyState,
  catalogWarrantyToPayload,
  validateCatalogWarranty,
} from "../shared/utils/catalogWarranty";
import { PROVIDER_PCINBOX } from "../constants/providers.constants";
import PosCostSummary from "./PosCostSummary";
import PosDeliveryAddress from "./PosDeliveryAddress";
import { listSaleDeliveries } from "./posDelivery";

import styles from "./punto-de-venta.module.css";

function paymentDetailIcon(method: string) {
  if (method === "efectivo_sucursal") return Banknote;
  if (method.startsWith("tarjeta") || method === "openpay_link") return CreditCard;
  if (method === "transferencia_bancaria") return Landmark;
  return CircleDollarSign;
}

/** Etiqueta de garantía para UI (detalle / meta del carrito). */
function saleItemWarrantyLabel(item: {
  warrantyMode?: string | null;
  warrantyMonths?: number | null;
  serials?: Array<{
    warrantyMode?: string | null;
    warrantyMonths?: number | null;
  }>;
}): string | null {
  const mode = String(item.warrantyMode || "").trim();
  const months =
    item.warrantyMonths != null && Number(item.warrantyMonths) > 0
      ? Number(item.warrantyMonths)
      : null;
  if (mode || months != null) {
    return warrantyCoverageLabel(mode || null, months);
  }
  const fromSerial = (item.serials || []).find(
    (s) =>
      String(s.warrantyMode || "").trim() ||
      (s.warrantyMonths != null && Number(s.warrantyMonths) > 0),
  );
  if (!fromSerial) return null;
  return warrantyCoverageLabel(
    fromSerial.warrantyMode,
    fromSerial.warrantyMonths,
  );
}

function cartLineWarrantyLabel(line: {
  warrantyMode?: string | null;
  warrantyMonths?: number | null;
}): string | null {
  const mode = String(line.warrantyMode || "").trim();
  const months =
    line.warrantyMonths != null && Number(line.warrantyMonths) > 0
      ? Number(line.warrantyMonths)
      : null;
  if (!mode && months == null) return null;
  return warrantyCoverageLabel(mode || null, months);
}

function paymentDetailNote(method: string, reference: string | null) {
  const raw = String(reference || "").trim();
  if (!raw) return "";
  const source =
    method === "otro"
      ? raw.match(
          /Recibido\s+[\d.]+(?:\s*·\s*Cambio\s+[\d.]+)?|Cambio\s+[\d.]+/i,
        )?.[0] || ""
      : raw;
  if (!source) return "";
  return source.replace(
    /(Recibido|Cambio)\s+([\d.]+)/gi,
    (_, label: string, amount: string) => {
      const value = Number(amount);
      return `${label} ${Number.isFinite(value) ? formatMoney(value) : amount}`;
    },
  );
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    transition: "box-shadow 160ms ease",
    "&:hover fieldset": { borderColor: "#bb3d4b" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(187, 61, 75, 0.16)",
    },
    "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
};

const money = formatMoney;
const qty = formatQty;

const FALLBACK_IMG =
  "https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587";

/** SKU/UPC visibles (oculta comodines internos POS). */
function displayProductCode(value?: string | null): string | null {
  const v = String(value || "").trim();
  if (!v) return null;
  if (v === "__POS_MANUAL__" || v === "__POS_SERVICE__") return null;
  if (/^manual$/i.test(v)) return null;
  return v;
}

function resolveProductImage(imageUrl: unknown): string {
  if (!imageUrl) return FALLBACK_IMG;
  if (typeof imageUrl === "string") {
    const t = imageUrl.trim();
    if (!t) return FALLBACK_IMG;
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return resolveProductImage(JSON.parse(t));
      } catch {
        return t;
      }
    }
    return t;
  }
  if (Array.isArray(imageUrl)) {
    const first = imageUrl.find((x) => typeof x === "string" && x.trim());
    return first ? String(first) : FALLBACK_IMG;
  }
  if (typeof imageUrl === "object") {
    const values = Object.values(imageUrl as Record<string, unknown>);
    const first = values.find((x) => typeof x === "string" && String(x).trim());
    return first ? String(first) : FALLBACK_IMG;
  }
  return FALLBACK_IMG;
}

const statusBadge = (status: PosSaleStatus) => {
  if (status === "cancelled") return styles.badgeCancelled;
  if (status === "pending_payment") return styles.badgePending;
  return styles.badgeCompleted;
};

const statusLabel = (status: PosSaleStatus) => {
  if (status === "cancelled") return "Cancelada";
  if (status === "pending_payment") return "Pendiente de pago";
  return "Completada";
};

function FacturaFlag({ required }: { required: boolean }) {
  return (
    <span
      className={`${styles.facturaFlag} ${
        required ? styles.facturaFlagOn : styles.facturaFlagOff
      }`}
      title={required ? "Cliente solicitó factura" : "No se solicitó factura"}
    >
      <span className={styles.facturaFlagIcon} aria-hidden>
        {required ? (
          <FileText size={13} strokeWidth={2.4} />
        ) : (
          <FileX2 size={13} strokeWidth={2.4} />
        )}
      </span>
      <span className={styles.facturaFlagText}>
        <span className={styles.facturaFlagLabel}>
          {required ? "Factura" : "Sin factura"}
        </span>
        <span className={styles.facturaFlagHint}>
          {required ? "Solicitada" : "No requerida"}
        </span>
      </span>
    </span>
  );
}

const serialStatusLabel = (status?: string | null) => {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  if (key === "sold") return "Vendido";
  if (key === "available") return "Disponible";
  if (key === "returned") return "Devuelto";
  if (key === "rma") return "En garantía (RMA)";
  if (key === "reserved") return "Reservado";
  return status || "—";
};

function productThumb(url?: string | null, className?: string) {
  const cls = className || styles.hitImg;
  const frame =
    cls === styles.hitImgLg
      ? styles.hitImgLgFrame
      : cls === styles.detailItemImg
        ? styles.detailItemImgFrame
        : cls === styles.hitImg
          ? styles.hitImgFrame
          : null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cls}
      src={url || FALLBACK_IMG}
      alt=""
      loading="lazy"
    />
  );
  return frame ? <span className={frame}>{img}</span> : img;
}

/** Recorta texto largo y agrega "..." (hover: title con completo). */
function clipText(value: unknown, max = 72): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
}

type ManualEquipRow = {
  key: string;
  quantity: string;
  description: string;
  serialNumber: string;
  conditionPreset: string;
  conditionOther: string;
};

function newManualEquipRow(): ManualEquipRow {
  return {
    key: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    quantity: "1",
    description: "",
    serialNumber: "",
    conditionPreset: POS_PHYSICAL_CONDITION_PRESETS[0],
    conditionOther: "",
  };
}

/** Cantidad entera: permite vaciar al editar; al salir vacío → 1; solo dígitos. */
function EquipQtyField({
  value,
  onCommit,
}: {
  value: number | string;
  onCommit: (n: number) => void;
}) {
  const committed = String(Math.max(1, parseInt(String(value), 10) || 1));
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    if (!focused) setDraft(committed);
  }, [committed, focused]);

  return (
    <TextField
      size="small"
      value={focused ? draft : committed}
      onFocus={() => {
        setFocused(true);
        setDraft(committed);
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
        setDraft(digits);
      }}
      onBlur={() => {
        setFocused(false);
        const n = Math.max(1, parseInt(draft, 10) || 1);
        setDraft(String(n));
        onCommit(n);
      }}
      inputProps={{
        inputMode: "numeric",
        pattern: "[0-9]*",
        maxLength: 4,
      }}
      sx={fieldSx}
    />
  );
}

function conditionUiFromStored(cond: string): {
  preset: string;
  other: string;
} {
  const c = String(cond || "").trim();
  if (
    (POS_PHYSICAL_CONDITION_PRESETS as readonly string[]).includes(c) &&
    c !== "Otro"
  ) {
    return { preset: c, other: "" };
  }
  if (!c) {
    return { preset: POS_PHYSICAL_CONDITION_PRESETS[0], other: "" };
  }
  return { preset: "Otro", other: c };
}

function emptyServiceEquipmentRow(): PosServiceIntake["equipment"][number] {
  return {
    quantity: 1,
    description: "",
    serialNumber: "",
    physicalCondition: POS_PHYSICAL_CONDITION_PRESETS[0],
  };
}

/** Editor de intake de taller dentro de una línea del carrito. */
function CartServiceIntakeEditor({
  lineKey,
  intake,
  onChange,
}: {
  lineKey: string;
  intake: PosServiceIntake | null | undefined;
  onChange: (next: PosServiceIntake) => void;
}) {
  const equipment =
    intake?.equipment?.length ? intake.equipment : [emptyServiceEquipmentRow()];
  const serviceType = String(intake?.serviceType || "").trim() || "Servicio";
  const failure = String(intake?.failureOrRequestedService || "");
  const techObs = String(intake?.technicalObservationsOnReceipt || "");

  const commit = (
    patch: Partial<PosServiceIntake> & {
      equipment?: PosServiceIntake["equipment"];
    },
  ) => {
    onChange({
      serviceType,
      equipment,
      failureOrRequestedService: failure,
      technicalObservationsOnReceipt: techObs,
      ...patch,
    });
  };

  const patchEquip = (
    index: number,
    patch: Partial<PosServiceIntake["equipment"][number]>,
  ) => {
    commit({
      equipment: equipment.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  return (
    <div className={`${styles.serviceIntakeBlock} ${styles.cartServiceIntake}`}>
      <div className={styles.serviceIntakeHead}>
        <strong>Datos del Equipo y/o componente</strong>
        <span>Puedes agregar, editar o quitar filas antes de cobrar.</span>
      </div>
      <div className={styles.equipTableWrap}>
        <table className={styles.equipTable}>
          <thead>
            <tr>
              <th style={{ width: 64 }}>Cant.</th>
              <th>Descripción / Marca / Modelo</th>
              <th style={{ width: 120 }}>Nº serie</th>
              <th style={{ width: 150 }}>Estado físico</th>
              <th style={{ width: 40 }} aria-label="Quitar" />
            </tr>
          </thead>
          <tbody>
            {equipment.map((row, idx) => {
              const condUi = conditionUiFromStored(row.physicalCondition);
              return (
                <tr key={`${lineKey}-eq-${idx}`}>
                  <td>
                    <EquipQtyField
                      value={row.quantity}
                      onCommit={(n) => patchEquip(idx, { quantity: n })}
                    />
                  </td>
                  <td>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.description}
                      onChange={(e) =>
                        patchEquip(idx, { description: e.target.value })
                      }
                      placeholder="Ej. Laptop HP Pavilion 15"
                      sx={fieldSx}
                    />
                  </td>
                  <td>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.serialNumber}
                      onChange={(e) =>
                        patchEquip(idx, { serialNumber: e.target.value })
                      }
                      placeholder="Opcional"
                      sx={fieldSx}
                    />
                  </td>
                  <td>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={condUi.preset}
                      onChange={(e) => {
                        const preset = e.target.value;
                        if (preset === "Otro") {
                          patchEquip(idx, {
                            physicalCondition: condUi.other || "",
                          });
                          return;
                        }
                        patchEquip(idx, { physicalCondition: preset });
                      }}
                      sx={fieldSx}
                    >
                      {POS_PHYSICAL_CONDITION_PRESETS.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </TextField>
                    {condUi.preset === "Otro" ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={condUi.other}
                        onChange={(e) =>
                          patchEquip(idx, {
                            physicalCondition: e.target.value,
                          })
                        }
                        placeholder="Describe el estado…"
                        sx={{ ...fieldSx, mt: 0.75 }}
                      />
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.equipRowRemove}
                      disabled={equipment.length <= 1}
                      onClick={() => {
                        if (equipment.length <= 1) return;
                        commit({
                          equipment: equipment.filter((_, i) => i !== idx),
                        });
                      }}
                      aria-label="Quitar fila"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className={styles.equipAddRowBtn}
        onClick={() =>
          commit({
            equipment: [...equipment, emptyServiceEquipmentRow()],
          })
        }
      >
        <Plus size={14} style={{ display: "inline", marginRight: 4 }} />
        Agregar fila
      </button>
      <div className={styles.serviceTextField}>
        <label
          className={`${styles.serviceFieldLabel} ${styles.serviceFieldLabelRequired}`}
          htmlFor={`cart-service-failure-${lineKey}`}
        >
          Falla o Servicio solicitado
        </label>
        <TextField
          id={`cart-service-failure-${lineKey}`}
          fullWidth
          size="small"
          value={failure}
          onChange={(e) =>
            commit({ failureOrRequestedService: e.target.value })
          }
          placeholder="Describe la falla o el servicio…"
          multiline
          minRows={2}
          maxRows={8}
          sx={{
            ...fieldSx,
            "& .MuiInputBase-root": {
              alignItems: "flex-start",
              backgroundColor: "#fff",
            },
          }}
        />
      </div>
      <div className={styles.serviceTextField}>
        <label
          className={styles.serviceFieldLabel}
          htmlFor={`cart-service-obs-${lineKey}`}
        >
          Observaciones Técnicas al Recibir
        </label>
        <TextField
          id={`cart-service-obs-${lineKey}`}
          fullWidth
          size="small"
          value={techObs}
          onChange={(e) =>
            commit({ technicalObservationsOnReceipt: e.target.value })
          }
          placeholder="Opcional"
          multiline
          minRows={2}
          maxRows={6}
          sx={{
            ...fieldSx,
            "& .MuiInputBase-root": {
              alignItems: "flex-start",
              backgroundColor: "#fff",
            },
          }}
        />
      </div>
    </div>
  );
}

export default function PuntoDeVentaPage() {
  const { can, hydrated } = usePermissions();
  const pos = usePos();
  const historyListRef = useRef<HTMLDivElement>(null);
  const warrantiesTableRef = useRef<HTMLDivElement>(null);
  const cashSessionsListRef = useRef<HTMLDivElement>(null);
  const cartListRef = useRef<HTMLDivElement>(null);
  const posTopSentinelRef = useRef<HTMLDivElement>(null);
  const [posTopStuck, setPosTopStuck] = useState(false);
  const [importTab, setImportTab] = useState<
    "quote" | "sale" | "reservation"
  >("quote");
  const importTabChosenRef = useRef(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualKind, setManualKind] = useState<"product" | "service">(
    "product",
  );
  const [manualServiceType, setManualServiceType] =
    useState<string>(POS_SERVICE_TYPE_PRESETS[0]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUpc, setManualUpc] = useState("");
  const [manualEquipRows, setManualEquipRows] = useState<ManualEquipRow[]>([
    newManualEquipRow(),
  ]);
  const [manualFailure, setManualFailure] = useState("");
  const [manualTechObs, setManualTechObs] = useState("");
  const [manualWarranty, setManualWarranty] = useState<CatalogWarrantyState>({
    choice: "",
    amount: "",
  });
  // Evita hydration mismatch de MUI TextField (useId distinto SSR vs cliente).
  const [clientReady, setClientReady] = useState(false);
  const manualDraftAppliedRef = useRef(false);
  const skipManualPersistRef = useRef(true);
  const prevManualCaptureRef = useRef<typeof pos.manualCapture | undefined>(
    undefined,
  );

  useEffect(() => {
    setClientReady(true);
  }, []);

  // Hidratar captura «sin catálogo» desde el borrador POS (una vez listo).
  useEffect(() => {
    if (!pos.draftReady || manualDraftAppliedRef.current) return;
    manualDraftAppliedRef.current = true;
    const m = pos.manualCapture;
    prevManualCaptureRef.current = m;
    if (m) {
      setManualOpen(Boolean(m.open));
      setManualKind(m.kind === "service" ? "service" : "product");
      setManualServiceType(m.serviceType || POS_SERVICE_TYPE_PRESETS[0]);
      setManualName(m.name || "");
      setManualPrice(m.price || "");
      setManualQty(m.qty || "1");
      setManualUpc(m.upc || "");
      setManualEquipRows(
        Array.isArray(m.equipRows) && m.equipRows.length > 0
          ? m.equipRows.map((row) => ({
              key: row.key || newManualEquipRow().key,
              quantity: row.quantity || "1",
              description: row.description || "",
              serialNumber: row.serialNumber || "",
              conditionPreset:
                row.conditionPreset || POS_PHYSICAL_CONDITION_PRESETS[0],
              conditionOther: row.conditionOther || "",
            }))
          : [newManualEquipRow()],
      );
      setManualFailure(m.failure || "");
      setManualTechObs(m.techObs || "");
      setManualWarranty({
        choice: m.warrantyChoice || "",
        amount:
          m.warrantyAmount === "" || m.warrantyAmount == null
            ? ""
            : Number(m.warrantyAmount) > 0
              ? Number(m.warrantyAmount)
              : "",
      });
    }
    skipManualPersistRef.current = true;
    // Solo al quedar listo el draft; manualCapture ya viene en ese mismo tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once when draftReady
  }, [pos.draftReady]);

  // Persistir captura manual en el borrador (después de hidratar).
  useEffect(() => {
    if (!pos.draftReady || !manualDraftAppliedRef.current) return;
    if (skipManualPersistRef.current) {
      skipManualPersistRef.current = false;
      return;
    }
    pos.setManualCapture({
      open: manualOpen,
      kind: manualKind,
      serviceType: manualServiceType,
      name: manualName,
      price: manualPrice,
      qty: manualQty,
      upc: manualUpc,
      equipRows: manualEquipRows,
      failure: manualFailure,
      techObs: manualTechObs,
      warrantyChoice: manualWarranty.choice,
      warrantyAmount: manualWarranty.amount,
    });
  }, [
    pos.draftReady,
    pos.setManualCapture,
    manualOpen,
    manualKind,
    manualServiceType,
    manualName,
    manualPrice,
    manualQty,
    manualUpc,
    manualEquipRows,
    manualFailure,
    manualTechObs,
    manualWarranty,
  ]);

  // Reset UI solo cuando el draft limpia captura (cobro/vaciar), no al montar con null.
  useEffect(() => {
    if (!pos.draftReady || !manualDraftAppliedRef.current) return;
    const prev = prevManualCaptureRef.current;
    prevManualCaptureRef.current = pos.manualCapture;
    if (pos.manualCapture != null) return;
    if (prev == null) return;
    setManualOpen(false);
    setManualKind("product");
    setManualServiceType(POS_SERVICE_TYPE_PRESETS[0]);
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setManualUpc("");
    setManualEquipRows([newManualEquipRow()]);
    setManualFailure("");
    setManualTechObs("");
    setManualWarranty({ choice: "", amount: "" });
    skipManualPersistRef.current = true;
  }, [pos.draftReady, pos.manualCapture]);

  // Scroll de página (F5): lo maneja AppContent + adminScrollMemory.

  useEffect(() => {
    const sentinel = posTopSentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setPosTopStuck(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "-56px 0px 0px 0px",
      },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [clientReady]);

  useEffect(() => {
    if (!pos.draftReady || importTabChosenRef.current) return;
    importTabChosenRef.current = true;
    const reservaFromUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("reserva")
        : "";
    if (reservaFromUrl || pos.linkedReservationRef) {
      setImportTab("reservation");
    } else if (pos.linkedPosFolio) {
      setImportTab("sale");
    } else if (pos.linkedQuoteNumber) {
      setImportTab("quote");
    }
  }, [
    pos.draftReady,
    pos.linkedPosFolio,
    pos.linkedQuoteNumber,
    pos.linkedReservationRef,
  ]);

  const resetManualForm = () => {
    setManualKind("product");
    setManualServiceType(POS_SERVICE_TYPE_PRESETS[0]);
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setManualUpc("");
    setManualEquipRows([newManualEquipRow()]);
    setManualFailure("");
    setManualTechObs("");
    setManualWarranty({ choice: "", amount: "" });
  };

  const manualWarrantyOpts = {
    providerId: PROVIDER_PCINBOX,
    isPC: 0,
  };

  const buildServiceIntake = (): PosServiceIntake | null => {
    const equipment = manualEquipRows
      .map((row) => {
        const condition =
          row.conditionPreset === "Otro"
            ? row.conditionOther.trim()
            : row.conditionPreset.trim();
        return {
          quantity: Math.max(1, parseInt(row.quantity, 10) || 1),
          description: row.description.trim(),
          serialNumber: row.serialNumber.trim(),
          physicalCondition: condition,
        };
      })
      .filter((row) => row.description.length > 0);
    return {
      serviceType: manualServiceType,
      equipment,
      failureOrRequestedService: manualFailure.trim(),
      technicalObservationsOnReceipt: manualTechObs.trim(),
    };
  };

  const submitManual = () => {
    const priceRaw = String(manualPrice || "").trim();
    const price = Number(priceRaw);
    const qty = parseInt(manualQty, 10);
    const resolvedName =
      manualKind === "service"
        ? manualServiceType === "Otro"
          ? manualName.trim()
          : manualServiceType
        : manualName.trim();
    if (resolvedName.length < 2) {
      return;
    }
    const warrantyErr = validateCatalogWarranty(
      manualWarranty,
      manualWarrantyOpts,
    );
    if (warrantyErr) {
      pos.addManualLine({
        name: resolvedName,
        unitPrice: Number.isFinite(price) ? price : 0,
        quantity: Number.isFinite(qty) ? qty : 1,
        upc: manualKind === "product" ? manualUpc : undefined,
        manualKind,
        serviceIntake:
          manualKind === "service" ? buildServiceIntake() : undefined,
      });
      return;
    }
    const warrantyPayload = catalogWarrantyToPayload(
      manualWarranty,
      manualWarrantyOpts,
    );
    const warrantyMode =
      warrantyPayload?.warrantyMode ||
      (manualWarranty.choice === "years" || manualWarranty.choice === "months"
        ? "months"
        : manualWarranty.choice) ||
      null;
    const warrantyMonths = warrantyPayload?.warrantyMonths ?? null;
    const warrantyUnit =
      (warrantyPayload?.warrantyUnit as "months" | "years" | null) || null;
    if (!priceRaw || !Number.isFinite(price) || price <= 0) {
      // Delega mensaje al hook (misma validación).
      pos.addManualLine({
        name: resolvedName,
        unitPrice: Number.isFinite(price) ? price : 0,
        quantity: Number.isFinite(qty) ? qty : 1,
        upc: manualKind === "product" ? manualUpc : undefined,
        warrantyMode,
        warrantyMonths,
        warrantyUnit,
        manualKind,
        serviceIntake:
          manualKind === "service" ? buildServiceIntake() : undefined,
      });
      return;
    }
    const ok = pos.addManualLine({
      name: resolvedName,
      unitPrice: price,
      quantity: Number.isFinite(qty) && qty >= 1 ? qty : 1,
      upc: manualKind === "product" ? manualUpc : undefined,
      warrantyMode,
      warrantyMonths,
      warrantyUnit,
      manualKind,
      serviceIntake:
        manualKind === "service" ? buildServiceIntake() : undefined,
    });
    if (ok) {
      resetManualForm();
      setManualOpen(false);
    }
  };

  const manualCanSubmit = (() => {
    const nameOk =
      manualKind === "service"
        ? manualServiceType === "Otro"
          ? manualName.trim().length >= 2
          : Boolean(manualServiceType)
        : manualName.trim().length >= 2;
    const price = Number(String(manualPrice || "").trim());
    const priceOk =
      String(manualPrice || "").trim() !== "" &&
      Number.isFinite(price) &&
      price > 0;
    const qty = parseInt(manualQty, 10);
    const qtyOk = Number.isFinite(qty) ? qty >= 1 : true;
    const warrantyOk =
      validateCatalogWarranty(manualWarranty, manualWarrantyOpts) == null;
    if (!nameOk || !priceOk || !qtyOk || !warrantyOk) return false;
    if (manualKind !== "service") return true;
    const intake = buildServiceIntake();
    if (!intake || intake.equipment.length < 1) return false;
    if (intake.equipment.some((r) => !r.physicalCondition)) return false;
    if (intake.failureOrRequestedService.trim().length < 2) return false;
    return true;
  })();

  if (!clientReady) {
    return (
      <AdminPageShell
        title="Punto de Venta"
        subtitle="Cobro en bodega con el mismo catálogo e inventario de la tienda"
      >
        <div className={`${styles.posPage} pos-page-root`}>
          <div className={styles.posLoadingShell}>
            <CircularProgress size={20} sx={{ color: "#bb3d4b" }} />
            Cargando punto de venta…
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (hydrated && !can("pos.manage")) {
    return (
      <AdminPageShell title="Punto de Venta" subtitle="Acceso restringido">
        <EmptyState
          title="Sin permiso"
          description="Tu rol no puede operar el Punto de Venta."
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Punto de Venta"
      subtitle="Cobro en bodega con el mismo catálogo e inventario de la tienda"
    >
      <div className={`${styles.posPage} pos-page-root`}>
        <div
          ref={posTopSentinelRef}
          className={styles.posTopSentinel}
          aria-hidden
        />
        <div
          className={`${styles.posTopSticky}${
            posTopStuck ? ` ${styles.posTopStickyStuck}` : ""
          }`}
        >
        <div className={styles.posTop}>
          <div className={styles.posTabs}>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "cobrar" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("cobrar")}
            >
              <span className={styles.posTabIcon}>
                <ShoppingCart size={15} strokeWidth={2.25} />
              </span>
              Cobrar
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "historial" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("historial")}
            >
              <span className={styles.posTabIcon}>
                <History size={15} strokeWidth={2.25} />
              </span>
              Historial
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "garantias" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("garantias")}
            >
              <span className={styles.posTabIcon}>
                <Shield size={15} strokeWidth={2.25} />
              </span>
              Garantías
            </button>
            <button
              type="button"
              className={`${styles.posTab} ${pos.tab === "caja" ? styles.posTabActive : ""}`}
              onClick={() => pos.setTab("caja")}
            >
              <span className={styles.posTabIcon}>
                <Wallet size={15} strokeWidth={2.25} />
              </span>
              Caja
            </button>
          </div>

          <div className={styles.branchPicker}>
            <div className={styles.headerActions}>
              <span
                className={`${styles.cashStatusPill} ${
                  pos.cashLoading || pos.cashSync === "loading"
                    ? styles.cashStatusPillPending
                    : pos.cashSync === "error"
                      ? styles.cashStatusPillWarn
                      : pos.cashOpen
                        ? styles.cashStatusPillOpen
                        : styles.cashStatusPillClosed
                }`}
                title={
                  pos.cashSyncMessage ||
                  (pos.cashOpen && pos.cashSession
                    ? `Sesión #${pos.cashSession.idCashSession}`
                    : pos.cashSync === "error"
                      ? "No se pudo verificar el estado de caja"
                      : "Sin caja abierta")
                }
              >
                <span className={styles.cashStatusDot} />
                {pos.cashLoading || pos.cashSync === "loading"
                  ? "Verificando caja…"
                  : pos.cashSync === "error"
                    ? pos.cashOpen
                      ? "Caja abierta · sin verificar"
                      : "Caja sin verificar"
                    : pos.cashOpen
                      ? "Caja abierta"
                      : "Caja cerrada"}
              </span>
              {pos.cashSync === "error" ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={pos.cashLoading}
                  onClick={() => void pos.loadCashStatus({ retries: 3 })}
                >
                  Reintentar
                </button>
              ) : null}
              {!(pos.cashLoading || pos.cashSync === "loading") &&
              !pos.cashOpen &&
              pos.cashSync === "ready" ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  <Wallet size={14} />
                  Abrir caja
                </button>
              ) : pos.cashOpen ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => pos.setTab("caja")}
                >
                  <Wallet size={14} />
                  Ver caja
                </button>
              ) : null}
              <button
                type="button"
                className={styles.drawerBtn}
                disabled={pos.qzBusy || !pos.qzSettings.printerName}
                title={
                  pos.qzSettings.printerName
                    ? "Abre el cajón físico (sin cobrar)"
                    : "Primero elige impresora en la pestaña Caja"
                }
                onClick={() => void pos.testQzDrawer()}
              >
                <Banknote size={14} />
                <span>
                  Abrir cajón
                  <span className={styles.hideOnSmall}> de dinero</span>
                </span>
              </button>
            </div>
          </div>
        </div>
        </div>

        {pos.tab === "cobrar" ? (
          <div className={styles.posTabBody}>
          <div className={styles.cobrarWorkspace}>
            {pos.cashSync === "error" && pos.branchId ? (
              <div
                className={`${styles.cashBanner} ${styles.cashBannerError}`}
                role="status"
              >
                <div className={styles.cashBannerMain}>
                  <span className={styles.cashBannerIcon} aria-hidden>
                    <Wallet size={18} strokeWidth={2.25} />
                  </span>
                  <div className={styles.cashBannerCopy}>
                    <p className={styles.cashBannerTitle}>
                      No se pudo verificar la caja
                    </p>
                    <p className={styles.cashBannerText}>
                      {pos.cashSyncMessage ||
                        "No asumas que está cerrada. Reintenta o revisa en la pestaña Caja."}
                    </p>
                  </div>
                </div>
                <div className={styles.cashBannerActions}>
                  <button
                    type="button"
                    className={styles.cashBannerPrimary}
                    disabled={pos.cashLoading}
                    onClick={() => void pos.loadCashStatus({ retries: 3 })}
                  >
                    {pos.cashLoading ? "Verificando…" : "Reintentar"}
                  </button>
                  <button
                    type="button"
                    className={styles.cashBannerSecondary}
                    onClick={() => pos.setTab("caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </div>
            ) : null}
            {pos.cashSync === "ready" && !pos.cashOpen && pos.branchId ? (
              <div
                className={`${styles.cashBanner} ${styles.cashBannerWarn}`}
                role="status"
              >
                <div className={styles.cashBannerMain}>
                  <span className={styles.cashBannerIcon} aria-hidden>
                    <Wallet size={18} strokeWidth={2.25} />
                  </span>
                  <div className={styles.cashBannerCopy}>
                    <p className={styles.cashBannerTitle}>Caja cerrada</p>
                    <p className={styles.cashBannerText}>
                      Ábrela solo si cobras en efectivo. Tarjeta y transferencia
                      no la requieren.
                    </p>
                  </div>
                </div>
                <div className={styles.cashBannerActions}>
                  <div className={styles.cashBannerFloat}>
                    <PosNumberField
                      label="Efectivo inicial (fondo)"
                      value={pos.openingFloat}
                      emptyAs="0"
                      onCommit={(raw) => pos.setOpeningFloat(raw || "0")}
                      sx={{ ...fieldSx, width: "100%" }}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.cashBannerPrimary}
                    disabled={pos.cashBusy}
                    onClick={() => void pos.openCash()}
                  >
                    {pos.cashBusy ? "Abriendo…" : "Abrir caja"}
                  </button>
                  <button
                    type="button"
                    className={styles.cashBannerSecondary}
                    onClick={() => pos.setTab("caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </div>
            ) : null}
            {pos.cashOpen && pos.cashExpected != null ? (
              <div
                className={`${styles.cashBanner} ${styles.cashBannerOk}`}
                role="status"
              >
                <div className={styles.cashBannerMain}>
                  <span className={styles.cashBannerIcon} aria-hidden>
                    <Wallet size={18} strokeWidth={2.25} />
                  </span>
                  <div className={styles.cashBannerCopy}>
                    <p className={styles.cashBannerTitle}>Caja abierta</p>
                    <p className={styles.cashBannerText}>
                      Esperado {money(pos.cashExpected)}
                      {pos.hasCashPayment
                        ? " · esta venta incluye efectivo"
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <section className={styles.customerBar} aria-label="Datos de la venta">
              <div className={styles.customerBarHead}>
                <p className={styles.panelEyebrow}>Cliente</p>
                <h2>Datos de la venta</h2>
              </div>
              <div className={styles.customerBarFields}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nombre del cliente (opcional)"
                  value={pos.customerName}
                  onChange={(e) => pos.setCustomerName(e.target.value)}
                  sx={{ ...fieldSx, mt: 0.5 }}
                />
                <div className={styles.phoneRow}>
                  <TextField
                    select
                    size="small"
                    label="Código de país (lada)"
                    value={pos.phoneLada}
                    onChange={(e) => pos.setPhoneLada(e.target.value)}
                    className={styles.ladaSelect}
                    sx={{ ...fieldSx, mt: 0.5 }}
                  >
                    {POS_PHONE_LADAS.map((lada) => (
                      <MenuItem key={lada} value={lada}>
                        {lada}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label="Teléfono (opcional)"
                    value={pos.guestPhone}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      pos.setGuestPhone(digits);
                    }}
                    sx={{ ...fieldSx, mt: 0.5 }}
                    error={Boolean(pos.guestPhone.trim()) && !pos.phoneValid}
                    helperText={
                      pos.guestPhone.trim() && !pos.phoneValid
                        ? "Deben ser 10 dígitos"
                        : undefined
                    }
                    inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  />
                </div>
              </div>
            </section>

            <div className={styles.cobrarColumns}>
            <section className={`${styles.posPanel} ${styles.catalogPanel}`}>
              <div className={styles.posPanelHead}>
                <div className={styles.posPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Catálogo</p>
                    <h2>Buscar y agregar a la venta</h2>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setManualOpen((v) => !v)}
                  >
                    <PenLine size={14} />
                    {manualOpen ? "Cerrar captura manual" : "Agregar sin catálogo"}
                  </button>
                </div>
              </div>
              <div className={styles.posPanelBody}>
                <div className={styles.catalogTools}>
                <div
                  className={styles.importTabToggle}
                  role="tablist"
                  aria-label="Qué importar"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={importTab === "quote"}
                    className={`${styles.importTabBtn} ${
                      importTab === "quote" ? styles.importTabBtnActive : ""
                    }`}
                    onClick={() => setImportTab("quote")}
                  >
                    Cotización
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={importTab === "sale"}
                    className={`${styles.importTabBtn} ${
                      importTab === "sale" ? styles.importTabBtnActive : ""
                    }`}
                    onClick={() => setImportTab("sale")}
                  >
                    Folio POS
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={importTab === "reservation"}
                    className={`${styles.importTabBtn} ${
                      importTab === "reservation"
                        ? styles.importTabBtnActive
                        : ""
                    }`}
                    onClick={() => setImportTab("reservation")}
                  >
                    Reserva
                  </button>
                </div>
                {importTab === "quote" ? (
                <div className={styles.quoteBox}>
                  <div className={styles.manualHead}>
                    <strong>Cotización</strong>
                    <span>Vigencia 5 días. Carga productos al carrito.</span>
                  </div>
                  {pos.quotePageAlert ? (
                    <div
                      className={`${styles.quotePageAlert} ${
                        pos.quotePageAlert.type === "error"
                          ? styles.quotePageAlertError
                          : pos.quotePageAlert.type === "warning"
                            ? styles.quotePageAlertWarning
                            : styles.quotePageAlertSuccess
                      }`}
                      role="alert"
                    >
                      <div className={styles.quoteAlertContent}>
                        <strong>{pos.quotePageAlert.title}</strong>
                        <p>{pos.quotePageAlert.message}</p>
                        {pos.quotePageAlert.sections?.length ? (
                          <div className={styles.quoteAlertScroll}>
                            {pos.quotePageAlert.sections.map((section) => (
                              <div
                                key={section.title}
                                className={styles.quoteAlertSection}
                              >
                                <span className={styles.quoteAlertSectionTitle}>
                                  {section.title} ({section.items.length})
                                </span>
                                <ul className={styles.quoteAlertList}>
                                  {section.items.map((item, idx) => (
                                    <li key={`${section.title}-${idx}`}>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={styles.quoteAlertClose}
                        aria-label="Cerrar aviso"
                        onClick={pos.dismissQuotePageAlert}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.quoteRow}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de cotización"
                      value={pos.quoteInput}
                      onChange={(e) => pos.setQuoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void pos.loadQuote();
                        }
                      }}
                      sx={fieldSx}
                      placeholder="Ej. 1726060800000"
                    />
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.quoteLoadBtn}`}
                      disabled={pos.quoteLoading}
                      onClick={() => void pos.loadQuote()}
                    >
                      {pos.quoteLoading ? "Cargando…" : "Cargar cotización"}
                    </button>
                  </div>
                  {pos.linkedQuoteNumber ? (
                    <div className={styles.quoteLinked}>
                      <span>
                        Cotización vinculada:{" "}
                        <strong>{pos.linkedQuoteNumber}</strong>
                        <span className={styles.quoteLinkedHint}>
                          {" "}
                          (puedes agregar más del catálogo o sin catálogo; no
                          otra cotización ni reimportar esta. Al desvincular
                          podrás cargar otra)
                        </span>
                      </span>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={pos.clearLinkedQuote}
                      >
                        Desvincular cotización
                      </button>
                    </div>
                  ) : null}
                </div>
                ) : null}
                {importTab === "sale" ? (
                <div className={`${styles.quoteBox} ${styles.folioBox}`}>
                  <div className={styles.manualHead}>
                    <strong>Folio POS</strong>
                    <span>
                      Venta de este punto de venta. Carga productos, cliente y
                      pagos para capturar las series. El stock no se vuelve a
                      descontar.
                    </span>
                  </div>
                  {pos.salePageAlert ? (
                    <div
                      className={`${styles.quotePageAlert} ${
                        pos.salePageAlert.type === "error"
                          ? styles.quotePageAlertError
                          : pos.salePageAlert.type === "warning"
                            ? styles.quotePageAlertWarning
                            : styles.quotePageAlertSuccess
                      }`}
                      role="alert"
                    >
                      <div className={styles.quoteAlertContent}>
                        <strong>{pos.salePageAlert.title}</strong>
                        <p>{pos.salePageAlert.message}</p>
                        {pos.salePageAlert.sections?.length ? (
                          <div className={styles.quoteAlertScroll}>
                            {pos.salePageAlert.sections.map((section) => (
                              <div
                                key={section.title}
                                className={styles.quoteAlertSection}
                              >
                                <span className={styles.quoteAlertSectionTitle}>
                                  {section.title} ({section.items.length})
                                </span>
                                <ul className={styles.quoteAlertList}>
                                  {section.items.map((item, idx) => (
                                    <li key={`${section.title}-${idx}`}>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={styles.quoteAlertClose}
                        aria-label="Cerrar aviso"
                        onClick={pos.dismissSalePageAlert}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.quoteRow}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Folio"
                      value={pos.saleInput}
                      onChange={(e) =>
                        pos.setSaleInput(
                          e.target.value.replace(/[^0-9#PVpv-]/g, "").slice(0, 32),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void pos.loadPosFolio();
                        }
                      }}
                      sx={fieldSx}
                      placeholder="Ej. 3414"
                    />
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.quoteLoadBtn}`}
                      disabled={pos.saleLoading}
                      onClick={() => void pos.loadPosFolio()}
                    >
                      {pos.saleLoading ? "Cargando…" : "Importar folio"}
                    </button>
                  </div>
                  {pos.linkedPosFolio ? (
                    <div className={styles.quoteLinked}>
                      <span>
                        Folio vinculado:{" "}
                        <strong>{pos.linkedPosFolio}</strong>
                        <span className={styles.quoteLinkedHint}>
                          {" "}
                          Captura el número de serie de cada producto. El resto
                          ya viene de la venta.
                        </span>
                      </span>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={pos.clearLinkedPosFolio}
                      >
                        Quitar folio
                      </button>
                    </div>
                  ) : null}
                </div>
                ) : null}
                {importTab === "reservation" ? (
                <div className={`${styles.quoteBox} ${styles.folioBox}`}>
                  <div className={styles.manualHead}>
                    <strong>Folio de reserva</strong>
                    <span>
                      Cita hecha en la tienda, con sesión o sin ella. Carga
                      cliente, equipo, servicio y la falla. El precio lo capturas
                      aquí antes de cobrar.
                    </span>
                  </div>
                  {pos.reservationPageAlert ? (
                    <div
                      className={`${styles.quotePageAlert} ${
                        pos.reservationPageAlert.type === "error"
                          ? styles.quotePageAlertError
                          : pos.reservationPageAlert.type === "warning"
                            ? styles.quotePageAlertWarning
                            : styles.quotePageAlertSuccess
                      }`}
                      role="alert"
                    >
                      <div className={styles.quoteAlertContent}>
                        <strong>{pos.reservationPageAlert.title}</strong>
                        <p>{pos.reservationPageAlert.message}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.quoteAlertClose}
                        aria-label="Cerrar aviso"
                        onClick={pos.dismissReservationPageAlert}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.quoteRow}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Folio de reserva"
                      value={pos.reservationInput}
                      onChange={(e) =>
                        pos.setReservationInput(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9-]/g, "")
                            .slice(0, 16),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void pos.loadReservationFolio();
                        }
                      }}
                      sx={fieldSx}
                      placeholder="Ej. PCX-4821-LP"
                    />
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.quoteLoadBtn}`}
                      disabled={pos.reservationLoading}
                      onClick={() => void pos.loadReservationFolio()}
                    >
                      {pos.reservationLoading ? "Cargando…" : "Importar reserva"}
                    </button>
                  </div>
                  {pos.linkedReservationRef ? (
                    <div className={styles.quoteLinked}>
                      <span>
                        Reserva vinculada:{" "}
                        <strong>{pos.linkedReservationRef}</strong>
                        <span className={styles.quoteLinkedHint}>
                          {" "}
                          Cliente, equipo y servicio ya están en la venta.
                          Captura el precio.
                        </span>
                      </span>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={pos.clearLinkedReservation}
                      >
                        Quitar reserva
                      </button>
                    </div>
                  ) : null}
                </div>
                ) : null}
                {manualOpen ? (
                  <div className={styles.manualBox}>
                    <div className={styles.manualHead}>
                      <strong>Captura sin catálogo</strong>
                      <span>
                        Producto o servicio adicional. No descuenta inventario.
                      </span>
                    </div>
                    <div className={styles.manualKindToggle} role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={manualKind === "product"}
                        className={`${styles.manualKindBtn} ${
                          manualKind === "product"
                            ? styles.manualKindBtnActive
                            : ""
                        }`}
                        onClick={() => setManualKind("product")}
                      >
                        Producto
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={manualKind === "service"}
                        className={`${styles.manualKindBtn} ${
                          manualKind === "service"
                            ? styles.manualKindBtnActive
                            : ""
                        }`}
                        onClick={() => setManualKind("service")}
                      >
                        Servicio adicional
                      </button>
                    </div>
                    <div className={styles.manualGrid}>
                      {manualKind === "service" ? (
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Tipo de servicio"
                          value={manualServiceType}
                          onChange={(e) =>
                            setManualServiceType(e.target.value)
                          }
                          sx={fieldSx}
                        >
                          {POS_SERVICE_TYPE_PRESETS.map((s) => (
                            <MenuItem key={s} value={s}>
                              {s}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          label="Nombre del artículo"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          sx={fieldSx}
                        />
                      )}
                      {manualKind === "service" &&
                      manualServiceType === "Otro" ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Nombre del servicio"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="Ej. Limpieza profunda de PC"
                          sx={fieldSx}
                        />
                      ) : null}
                      <PosNumberField
                        label="Precio unitario"
                        value={manualPrice}
                        emptyAs="0"
                        onCommit={(raw) => setManualPrice(raw)}
                      />
                      <PosNumberField
                        label="Cantidad"
                        integer
                        value={manualQty}
                        emptyAs="1"
                        onCommit={(raw) => {
                          const digits = String(raw)
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setManualQty(digits || "1");
                        }}
                      />
                      {manualKind === "product" ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Código de barras (opcional)"
                          value={manualUpc}
                          onChange={(e) => setManualUpc(e.target.value)}
                          sx={fieldSx}
                        />
                      ) : null}
                      <div style={{ gridColumn: "1 / -1" }}>
                        <CatalogWarrantyFields
                          alwaysShow
                          value={manualWarranty}
                          onChange={setManualWarranty}
                        />
                      </div>
                    </div>
                    {manualKind === "service" ? (
                      <div className={styles.serviceIntakeBlock}>
                        <div className={styles.serviceIntakeHead}>
                          <strong>Datos del Equipo y/o componente</strong>
                          <span>
                            Registra cada equipo o componente que entra a
                            taller.
                          </span>
                        </div>
                        <div className={styles.equipTableWrap}>
                          <table className={styles.equipTable}>
                            <thead>
                              <tr>
                                <th style={{ width: 72 }}>Cantidad</th>
                                <th>
                                  Descripción del Equipo/Comp. Marca/Modelo
                                </th>
                                <th style={{ width: 140 }}>Número de serie</th>
                                <th style={{ width: 180 }}>Estado Físico</th>
                                <th style={{ width: 44 }} aria-label="Quitar" />
                              </tr>
                            </thead>
                            <tbody>
                              {manualEquipRows.map((row) => (
                                <tr key={row.key}>
                                  <td>
                                    <EquipQtyField
                                      value={row.quantity}
                                      onCommit={(n) =>
                                        setManualEquipRows((prev) =>
                                          prev.map((r) =>
                                            r.key === row.key
                                              ? { ...r, quantity: String(n) }
                                              : r,
                                          ),
                                        )
                                      }
                                    />
                                  </td>
                                  <td>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      value={row.description}
                                      onChange={(e) =>
                                        setManualEquipRows((prev) =>
                                          prev.map((r) =>
                                            r.key === row.key
                                              ? {
                                                  ...r,
                                                  description: e.target.value,
                                                }
                                              : r,
                                          ),
                                        )
                                      }
                                      placeholder="Ej. Laptop HP Pavilion 15"
                                      sx={fieldSx}
                                    />
                                  </td>
                                  <td>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      value={row.serialNumber}
                                      onChange={(e) =>
                                        setManualEquipRows((prev) =>
                                          prev.map((r) =>
                                            r.key === row.key
                                              ? {
                                                  ...r,
                                                  serialNumber: e.target.value,
                                                }
                                              : r,
                                          ),
                                        )
                                      }
                                      placeholder="Opcional"
                                      sx={fieldSx}
                                    />
                                  </td>
                                  <td>
                                    <TextField
                                      select
                                      size="small"
                                      fullWidth
                                      value={row.conditionPreset}
                                      onChange={(e) =>
                                        setManualEquipRows((prev) =>
                                          prev.map((r) =>
                                            r.key === row.key
                                              ? {
                                                  ...r,
                                                  conditionPreset:
                                                    e.target.value,
                                                }
                                              : r,
                                          ),
                                        )
                                      }
                                      sx={fieldSx}
                                    >
                                      {POS_PHYSICAL_CONDITION_PRESETS.map(
                                        (opt) => (
                                          <MenuItem key={opt} value={opt}>
                                            {opt}
                                          </MenuItem>
                                        ),
                                      )}
                                    </TextField>
                                    {row.conditionPreset === "Otro" ? (
                                      <TextField
                                        size="small"
                                        fullWidth
                                        value={row.conditionOther}
                                        onChange={(e) =>
                                          setManualEquipRows((prev) =>
                                            prev.map((r) =>
                                              r.key === row.key
                                                ? {
                                                    ...r,
                                                    conditionOther:
                                                      e.target.value,
                                                  }
                                                : r,
                                            ),
                                          )
                                        }
                                        placeholder="Describe el estado…"
                                        sx={{ ...fieldSx, mt: 0.75 }}
                                      />
                                    ) : null}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className={styles.equipRowRemove}
                                      disabled={manualEquipRows.length <= 1}
                                      onClick={() =>
                                        setManualEquipRows((prev) =>
                                          prev.length <= 1
                                            ? prev
                                            : prev.filter(
                                                (r) => r.key !== row.key,
                                              ),
                                        )
                                      }
                                      aria-label="Quitar fila"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button
                          type="button"
                          className={styles.equipAddRowBtn}
                          onClick={() =>
                            setManualEquipRows((prev) => [
                              ...prev,
                              newManualEquipRow(),
                            ])
                          }
                        >
                          <Plus
                            size={14}
                            style={{ display: "inline", marginRight: 4 }}
                          />
                          Agregar fila
                        </button>
                        <div className={styles.serviceTextField}>
                          <label
                            className={`${styles.serviceFieldLabel} ${styles.serviceFieldLabelRequired}`}
                            htmlFor="pos-service-failure"
                          >
                            Falla o Servicio solicitado
                          </label>
                          <TextField
                            id="pos-service-failure"
                            fullWidth
                            size="small"
                            value={manualFailure}
                            onChange={(e) => setManualFailure(e.target.value)}
                            placeholder="Describe la falla o el servicio que solicita el cliente…"
                            multiline
                            minRows={3}
                            maxRows={10}
                            sx={{
                              ...fieldSx,
                              "& .MuiInputBase-root": {
                                alignItems: "flex-start",
                                backgroundColor: "#fff",
                              },
                            }}
                          />
                        </div>
                        <div className={styles.serviceTextField}>
                          <label
                            className={styles.serviceFieldLabel}
                            htmlFor="pos-service-tech-obs"
                          >
                            Observaciones Técnicas al Recibir
                          </label>
                          <TextField
                            id="pos-service-tech-obs"
                            fullWidth
                            size="small"
                            value={manualTechObs}
                            onChange={(e) => setManualTechObs(e.target.value)}
                            placeholder="Notas técnicas al recibir el equipo (opcional)…"
                            multiline
                            minRows={3}
                            maxRows={10}
                            sx={{
                              ...fieldSx,
                              "& .MuiInputBase-root": {
                                alignItems: "flex-start",
                                backgroundColor: "#fff",
                              },
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={submitManual}
                      disabled={!manualCanSubmit}
                    >
                      <Plus
                        size={14}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                      {manualKind === "service"
                        ? "Agregar servicio"
                        : "Agregar producto"}
                    </button>
                  </div>
                ) : null}
                <div className={styles.searchBlock}>
                  <div className={styles.searchBlockHead}>
                    <strong>Agregar del catálogo</strong>
                    <span>
                      Busca en inventario e incorpora al carrito (nombre, clave o
                      código de barras). Incluye componentes, PC gamer y
                      workstation.
                    </span>
                  </div>
                  <div className={styles.searchCombobox}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Producto a agregar"
                    placeholder="Escribe o escanea para agregar al carrito…"
                    value={pos.search}
                    onChange={(e) => pos.setSearch(e.target.value)}
                    inputRef={pos.searchRef}
                    sx={fieldSx}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const hit = pos.hits.find(
                        (h: PosProductHit) => !isPosProductOutOfStock(h),
                      );
                      if (!hit) {
                        e.preventDefault();
                        return;
                      }
                      e.preventDefault();
                      const stocks = hit.stocksByBranch || [];
                      if (stocks.length === 1) {
                        pos.addProduct(hit, stocks[0].branchId);
                      } else if (stocks.length > 1) {
                        const one = stocks.filter((st) => st.stock > 0);
                        if (one.length === 1) {
                          pos.addProduct(hit, one[0].branchId);
                        } else {
                          pos.addProduct(hit, hit.suggestedBranchId);
                        }
                      } else {
                        pos.addProduct(hit, null);
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <Search
                          size={18}
                          style={{ marginRight: 8, color: "#9ca3af" }}
                        />
                      ),
                      endAdornment: pos.searching ? (
                        <CircularProgress size={18} />
                      ) : null,
                    }}
                  />
                  {pos.searching ||
                  pos.hits.length > 0 ||
                  pos.search.trim().length > 0 ? (
                    <div
                      className={styles.hitsDropdown}
                      role="listbox"
                      aria-label="Coincidencias del catálogo"
                    >
                      {pos.searching && pos.hits.length === 0 ? (
                        <div className={styles.hitsDropdownLoading}>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={`sk-${i}`} className={styles.hitSkeleton}>
                              <div className={styles.hitSkeletonImg} />
                              <div className={styles.hitSkeletonBody}>
                                <div className={styles.hitSkeletonLine} />
                                <div className={styles.hitSkeletonLineShort} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : pos.hits.length === 0 ? (
                        <div className={styles.hitsDropdownEmpty}>
                          Sin coincidencias. Prueba otro término o «Agregar sin
                          catálogo».
                        </div>
                      ) : (
                        <div className={styles.hits}>
                          {pos.hits.map((hit: PosProductHit) => {
                      const img = resolveProductImage(hit.image_url);
                      const stocks = hit.stocksByBranch || [];
                      const outOfStock = isPosProductOutOfStock(hit);
                      const stockTotal =
                        stocks.length > 0
                          ? stocks.reduce(
                              (sum, st) =>
                                sum + Math.max(0, Number(st.stock) || 0),
                              0,
                            )
                          : Number(hit.stockGlobal) || 0;
                      const singleBranch =
                        stocks.length === 1 ? stocks[0] : null;
                      const multiBranch = stocks.length > 1;
                      const hitSku = displayProductCode(hit.sku);
                      const hitUpc = displayProductCode(hit.upc);
                      const metaBits = [
                        hitSku ? `SKU ${hitSku}` : null,
                        hitUpc ? `UPC ${hitUpc}` : null,
                        hit.category || null,
                      ].filter(Boolean);

                      const addFromHit = () => {
                        if (outOfStock) return;
                        if (stocks.length === 1) {
                          pos.addProduct(hit, stocks[0].branchId);
                        } else if (stocks.length > 1) {
                          const one = stocks.filter((st) => st.stock > 0);
                          if (one.length === 1) {
                            pos.addProduct(hit, one[0].branchId);
                          } else {
                            pos.addProduct(hit, hit.suggestedBranchId);
                          }
                        } else {
                          pos.addProduct(hit, null);
                        }
                      };

                      return (
                        <article
                          key={hit.idProduct}
                          className={`${styles.hitCard} ${
                            outOfStock ? styles.hitCardOutOfStock : ""
                          }`}
                        >
                          <button
                            type="button"
                            className={styles.hitMain}
                            disabled={outOfStock}
                            title={
                              outOfStock
                                ? "Sin existencia — no se puede agregar"
                                : multiBranch
                                  ? "Elige una bodega, o clic para la sugerida"
                                  : "Agregar al carrito"
                            }
                            aria-disabled={outOfStock}
                            onClick={addFromHit}
                          >
                            <div className={styles.hitMedia}>
                              <div className={styles.hitMediaImg}>
                                {productThumb(img, styles.hitImgLg)}
                              </div>
                              {outOfStock ? (
                                <span className={styles.hitMediaBadge}>
                                  Agotado
                                </span>
                              ) : null}
                            </div>

                            <div className={styles.hitBody}>
                              <h3
                                className={styles.hitTitle}
                                title={
                                  hit.name || `Producto #${hit.idProduct}`
                                }
                              >
                                {hit.name || `Producto #${hit.idProduct}`}
                              </h3>

                              <div className={styles.hitMetaRow}>
                                {outOfStock ? (
                                  <span className={styles.chipOutOfStock}>
                                    Sin stock
                                  </span>
                                ) : null}
                                {hit.isPC ? (
                                  <span className={styles.chip} title={hit.pcLabel || "PC armada"}>
                                    {hit.pcLabel || "PC armada"}
                                  </span>
                                ) : null}
                                {hit.providerName ? (
                                  <span
                                    className={styles.chip}
                                    title={hit.providerName}
                                  >
                                    {hit.providerName}
                                  </span>
                                ) : null}
                                {hit.marca ? (
                                  <span
                                    className={styles.chipMuted}
                                    title={hit.marca}
                                  >
                                    {hit.marca}
                                  </span>
                                ) : null}
                              </div>

                              {metaBits.length > 0 ? (
                                <p className={styles.hitMeta}>
                                  {metaBits.join("  ·  ")}
                                </p>
                              ) : null}

                              {!multiBranch &&
                              singleBranch &&
                              !outOfStock ? (
                                <div className={styles.hitStockLine}>
                                  <span>
                                    {formatPosBranchUiLabel({
                                      name: singleBranch.name,
                                      label: singleBranch.label,
                                      city: singleBranch.city,
                                      fallback: String(singleBranch.branchId),
                                    })}
                                  </span>
                                  <span className={styles.hitStockQty}>
                                    {singleBranch.stock}
                                  </span>
                                </div>
                              ) : null}

                              {!multiBranch &&
                              !singleBranch &&
                              !outOfStock ? (
                                <div className={styles.hitStockLine}>
                                  <span>Disponible</span>
                                  <span className={styles.hitStockQty}>
                                    {stockTotal}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className={styles.hitSide}>
                              <div className={styles.hitPriceBlock}>
                                <div className={styles.hitPrice}>
                                  {money(hit.price)}
                                </div>
                              </div>
                              <span
                                className={
                                  outOfStock
                                    ? styles.hitCtaDisabled
                                    : styles.hitCta
                                }
                              >
                                {outOfStock ? (
                                  "Agotado"
                                ) : (
                                  <>
                                    <Plus size={15} strokeWidth={2.5} />
                                    Agregar
                                  </>
                                )}
                              </span>
                            </div>
                          </button>

                          {multiBranch ? (
                            <div className={styles.hitBranchRow}>
                              {stocks.map((st) => {
                                const empty = st.stock <= 0;
                                return (
                                  <button
                                    key={st.branchId}
                                    type="button"
                                    className={`${styles.hitBranch} ${
                                      empty ? styles.hitBranchEmpty : ""
                                    }`}
                                    disabled={empty || outOfStock}
                                    onClick={() =>
                                      pos.addProduct(hit, st.branchId)
                                    }
                                  >
                                    <span className={styles.hitBranchName}>
                                      {formatPosBranchUiLabel({
                                        name: st.name,
                                        label: st.label,
                                        city: st.city,
                                        fallback: String(st.branchId),
                                      })}
                                    </span>
                                    <span className={styles.hitBranchQty}>
                                      {st.stock}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                        </div>
                      )}
                    </div>
                  ) : null}
                  </div>
                </div>
                </div>
              </div>
            </section>

            <aside className={`${styles.posPanel} ${styles.cartPanel}`}>
              <div className={styles.posPanelHead}>
                <div className={styles.posPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Cobro</p>
                    <h2>
                      <ShoppingCart size={18} strokeWidth={2.25} />
                      Carrito
                    </h2>
                    <p>
                      {pos.cart.length === 0
                        ? "Sin productos todavía"
                        : `${pos.cart.length} línea${pos.cart.length === 1 ? "" : "s"} · ${money(pos.totals.total)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.clearCartBtn}
                    onClick={pos.requestClearCart}
                    disabled={pos.cart.length === 0}
                    title="Eliminar todos los ítems del carrito"
                  >
                    <Trash2 size={15} strokeWidth={2.25} />
                    Vaciar carrito
                  </button>
                </div>
              </div>
              <div className={styles.cartPanelBody}>
                <div className={styles.cartPanelScroll}>
                {pos.cart.length === 0 ? (
                  <div className={styles.cartEmpty}>
                    <EmptyState
                      compact
                      icon="orders"
                      title="Carrito vacío"
                      description="Agrega productos desde «Producto a agregar» (catálogo)."
                    />
                  </div>
                ) : (
                  <>
                    <TextField
                      size="small"
                      label="Filtrar en este carrito"
                      placeholder="Solo lo ya agregado (nombre, SKU, UPC o serie)…"
                      value={pos.cartSearch}
                      onChange={(e) => pos.setCartSearch(e.target.value)}
                      fullWidth
                      sx={fieldSx}
                      InputProps={{
                        startAdornment: (
                          <Search
                            size={16}
                            strokeWidth={2.25}
                            style={{ marginRight: 8, color: "#78716c" }}
                          />
                        ),
                      }}
                    />
                    {pos.cartFilteredTotal === 0 ? (
                      <EmptyState
                        compact
                        icon="orders"
                        title="Sin coincidencias"
                        description="Prueba otro término o limpia la búsqueda."
                      />
                    ) : (
                      <>
                        {pos.cartFilteredTotal > 0 ? (
                          <div className={styles.cartPager}>
                            <ModernPagination
                              page={pos.cartPage}
                              pageCount={Math.max(pos.cartTotalPages, 1)}
                              totalItems={pos.cartFilteredTotal}
                              pageSize={pos.cartPageSize}
                              label="líneas"
                              scrollOnChange={false}
                              onPageChange={(p) => pos.goCartPage(p)}
                            />
                          </div>
                        ) : null}
                        <div ref={cartListRef} className={styles.cartList}>
                          {pos.cartPageItems.map((line) => {
                      const lineSku = displayProductCode(line.sku);
                      const lineUpc = displayProductCode(line.upc);
                      return (
                      <div key={line.key} className={styles.cartCard}>
                        <div className={styles.cartCardHead}>
                          {productThumb(
                            resolveProductImage(line.imageUrl),
                            styles.cartImg,
                          )}
                          <div className={styles.cartCardInfo}>
                            <div className={styles.cartLineName}>
                              {line.name}
                              {line.isManual ? (
                                <span
                                  className={`${styles.manualBadge} ${
                                    line.manualKind === "service"
                                      ? styles.manualBadgeService
                                      : ""
                                  }`}
                                >
                                  {line.manualKind === "service"
                                    ? "Servicio"
                                    : "Sin catálogo"}
                                </span>
                              ) : null}
                              {!line.isManual && line.catalogInactive ? (
                                <span
                                  className={`${styles.manualBadge} ${styles.inactiveBadge}`}
                                  title="Se desactivó en el catálogo. Al cobrar podrás quitarlo o agregarlo como captura manual."
                                >
                                  Inactivo en catálogo
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.hitMeta}>
                              {[
                                lineSku && `SKU ${lineSku}`,
                                lineUpc && `UPC ${lineUpc}`,
                                !line.isManual &&
                                  (line.branchId != null ||
                                    line.branchLabel ||
                                    Number(line.providerId) === 1) &&
                                  `Bodega: ${
                                    line.branchId != null || line.branchLabel
                                      ? formatPosBranchUiLabel({
                                          label: line.branchLabel,
                                          name:
                                            line.stocksByBranch?.find(
                                              (s) =>
                                                s.branchId === line.branchId,
                                            )?.name || null,
                                          city:
                                            line.stocksByBranch?.find(
                                              (s) =>
                                                s.branchId === line.branchId,
                                            )?.city || null,
                                          fallback:
                                            Number(line.providerId) === 1
                                              ? "PCinBOX-León"
                                              : "Bodega",
                                        })
                                      : "PCinBOX-León"
                                  }`,
                                (() => {
                                  const w = cartLineWarrantyLabel(line);
                                  return w ? `Garantía: ${w}` : null;
                                })(),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                            {line.isManual ? (
                              <div className={styles.cartUnitPriceEdit}>
                                <PosNumberField
                  label="Precio por unidad"
                                  value={line.unitPrice}
                                  emptyAs="0"
                                  onCommit={(raw) => {
                                    const n = Number(raw);
                                    pos.updateLine(line.key, {
                                      unitPrice:
                                        Number.isFinite(n) && n >= 0 ? n : 0,
                                    });
                                  }}
                                />
                              </div>
                            ) : (
                              <div className={styles.cartUnitPrice}>
                                <span className={styles.cartUnitPriceLabel}>
                                  Precio
                                </span>
                                <span className={styles.cartUnitPriceValue}>
                                  {money(line.unitPrice)}
                                </span>
                                <span className={styles.cartUnitPriceHint}>
                                  {line.quotePriceLocked
                                    ? "precio de cotización"
                                    : line.folioPriceLocked
                                      ? "precio del folio"
                                      : "por unidad"}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => pos.removeLine(line.key)}
                            aria-label="Quitar del carrito"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {line.isManual && line.manualKind === "service" ? (
                          <CartServiceIntakeEditor
                            lineKey={line.key}
                            intake={line.serviceIntake}
                            onChange={(next) =>
                              pos.updateLine(line.key, {
                                serviceIntake: next,
                              })
                            }
                          />
                        ) : line.isManual ? (
                          <p
                            className={styles.hitMeta}
                            style={{ marginBottom: 8 }}
                          >
                            Captura manual · no descuenta inventario
                          </p>
                        ) : line.stocksByBranch?.length ? (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Bodega de origen"
                            value={line.branchId ?? ""}
                            onChange={(e) => {
                              const branchId = Number(e.target.value);
                              const st = line.stocksByBranch.find(
                                (s) => s.branchId === branchId,
                              );
                              pos.updateLine(line.key, {
                                branchId,
                                branchLabel: formatPosBranchUiLabel({
                                  name: st?.name,
                                  label: st?.label,
                                  city: st?.city,
                                }),
                                stockBranch: st?.stock ?? 0,
                              });
                            }}
                            sx={{ ...fieldSx, mb: 1 }}
                          >
                            {line.stocksByBranch.map((st) => (
                              <MenuItem
                                key={st.branchId}
                                value={st.branchId}
                                disabled={
                                  st.stock <= 0 && st.branchId !== line.branchId
                                }
                              >
                                {formatPosBranchUiLabel({
                                  name: st.name,
                                  label: st.label,
                                  city: st.city,
                                })}{" "}
                                ({st.stock})
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <p
                            className={styles.hitMeta}
                            style={{ marginBottom: 8 }}
                          >
                            Existencia general (sin bodega)
                          </p>
                        )}
                        <div className={styles.cartControls}>
                          <PosNumberField
                            label="Cantidad"
                            integer
                            value={line.quantity}
                            emptyAs="1"
                            onCommit={(raw) => {
                              let n = parseInt(raw, 10);
                              if (!Number.isFinite(n) || n < 1) n = 1;
                              pos.updateLine(line.key, {
                                quantity: n,
                              });
                            }}
                          />
                        </div>
                        <div className={styles.cartLineTotal}>
                          <span>Importe de línea</span>
                          <strong>
                            {money(
                              pos.lineTotal(
                                line.unitPrice,
                                line.quantity,
                                0,
                              ),
                            )}
                          </strong>
                        </div>
                        <div className={styles.serialBlock}>
                          {line.manualKind === "service" ? null : (
                          <div className={styles.serialHead}>
                            <span>
                              {line.requiresSerial
                                ? "Números de serie (obligatorio)"
                                : "Números de serie (opcional)"}
                            </span>
                            {pos.isAdmin || line.isManual ? (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() =>
                                  void pos.toggleRequiresSerial(
                                    line.key,
                                    line.productId,
                                    !line.requiresSerial,
                                  )
                                }
                              >
                                {line.requiresSerial
                                  ? "Serie opcional"
                                  : "Serie obligatoria"}
                              </button>
                            ) : null}
                          </div>
                          )}
                          {posWarrantySelectable({
                            providerId: line.providerId,
                            isPC: line.isPC,
                            isManual: line.isManual,
                          }) && !(line.folioPriceLocked && line.warrantyMode) ? (
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                marginBottom: 10,
                              }}
                            >
                              <TextField
                                select
                                size="small"
                                fullWidth
                                label="Garantía"
                                value={
                                  line.warrantyMode === "none"
                                    ? "none"
                                    : line.warrantyMode === "service_center"
                                      ? "service_center"
                                      : line.warrantyMode === "months"
                                        ? line.warrantyUnit === "years"
                                          ? "years"
                                          : "months"
                                        : ""
                                }
                                onChange={(e) => {
                                  const mode = e.target.value;
                                  if (
                                    mode === "none" ||
                                    mode === "service_center"
                                  ) {
                                    pos.updateLine(line.key, {
                                      warrantyMode: mode,
                                      warrantyMonths: null,
                                      warrantyUnit: null,
                                    });
                                    return;
                                  }
                                  pos.updateLine(line.key, {
                                    warrantyMode: "months",
                                    warrantyUnit:
                                      mode === "years" ? "years" : "months",
                                    warrantyMonths:
                                      line.warrantyMonths &&
                                      line.warrantyMonths > 0
                                        ? line.warrantyMonths
                                        : mode === "years"
                                          ? 1
                                          : 12,
                                  });
                                }}
                                sx={fieldSx}
                              >
                                <MenuItem value="">Elegir…</MenuItem>
                                <MenuItem value="months">Meses</MenuItem>
                                <MenuItem value="years">Años</MenuItem>
                                <MenuItem value="none">No aplica</MenuItem>
                                <MenuItem value="service_center">
                                  Centro de servicio
                                </MenuItem>
                              </TextField>
                              {line.warrantyMode === "months" ? (
                                <TextField
                                  size="small"
                                  fullWidth
                                  type="number"
                                  label={
                                    line.warrantyUnit === "years"
                                      ? "Cantidad (años)"
                                      : "Cantidad (meses)"
                                  }
                                  value={line.warrantyMonths ?? ""}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    pos.updateLine(line.key, {
                                      warrantyMonths: Number.isFinite(n)
                                        ? n
                                        : null,
                                    });
                                  }}
                                  inputProps={{ min: 1, step: 1 }}
                                  sx={fieldSx}
                                />
                              ) : null}
                            </div>
                          ) : line.warrantyMode ||
                            (line.warrantyMonths != null &&
                              Number(line.warrantyMonths) > 0) ? (
                            <p
                              className={styles.hitMeta}
                              style={{ marginBottom: 8 }}
                            >
                              Garantía:{" "}
                              {warrantyCoverageLabel(
                                line.warrantyMode,
                                line.warrantyMonths,
                              )}
                            </p>
                          ) : null}
                          {line.manualKind === "service"
                            ? null
                            : Array.from({ length: line.quantity }).map((_, i) => (
                            <TextField
                              key={`${line.key}-sn-${i}`}
                              size="small"
                              fullWidth
                              label={`Número de serie ${i + 1}`}
                              value={line.serials[i] || ""}
                              onChange={(e) =>
                                pos.setLineSerial(
                                  line.key,
                                  i,
                                  e.target.value,
                                )
                              }
                              sx={{ ...fieldSx, mt: 0.75 }}
                              required={line.requiresSerial}
                            />
                          ))}
                        </div>
                      </div>
                    );
                          })}
                        </div>
                        {pos.cartFilteredTotal > 0 ? (
                          <div className={styles.cartPager}>
                            <ModernPagination
                              page={pos.cartPage}
                              pageCount={Math.max(pos.cartTotalPages, 1)}
                              totalItems={pos.cartFilteredTotal}
                              pageSize={pos.cartPageSize}
                              label="líneas"
                              scrollTargetRef={cartListRef}
                              onPageChange={(p) => pos.goCartPage(p)}
                            />
                          </div>
                        ) : null}
                      </>
                    )}
                  </>
                )}
                </div>

                <div className={styles.cartFooterFixed}>
                <div className={styles.cartCheckoutBlock}>
                  <PosDeliveryAddress
                    enabled={pos.homeDelivery}
                    onEnabledChange={pos.setHomeDelivery}
                    addresses={pos.deliveryAddresses}
                    editor={pos.deliveryEditor}
                    errors={pos.deliveryErrors}
                    onStartAdd={pos.startAddDelivery}
                    onStartEdit={pos.startEditDelivery}
                    onRemove={pos.removeDeliveryAddress}
                    onChangeEditor={pos.changeDeliveryEditor}
                    onRegister={pos.registerDelivery}
                    onCancelEditor={pos.cancelDeliveryEditor}
                  />
                  <div className={styles.totalsBox}>
                    <div
                      className={styles.totalsSplitBox}
                      aria-label="Conteo de productos y servicios"
                    >
                      <div className={styles.totalsSplitRow}>
                        <span>Total Productos</span>
                        <strong>{pos.totals.productsItems}</strong>
                      </div>
                      <div className={styles.totalsSplitRow}>
                        <span>Total Servicios</span>
                        <strong>{pos.totals.servicesItems}</strong>
                      </div>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Subtotal</span>
                      <span>{money(pos.totals.subtotal)}</span>
                    </div>
                    {pos.homeDelivery ? (
                      <div className={styles.totalsRow}>
                        <span>Envío</span>
                        <span>{money(pos.totals.shippingCost)}</span>
                      </div>
                    ) : null}
                    <div className={styles.totalsRow}>
                      <span>Pagado</span>
                      <span>{money(pos.settlement.paidApplied)}</span>
                    </div>
                    <div className={styles.totalsRow}>
                      <span>Falta por pagar</span>
                      <strong
                        className={
                          pos.remaining > 0.009
                            ? styles.totalsWarn
                            : styles.totalsOk
                        }
                      >
                        {money(pos.remaining)}
                      </strong>
                    </div>
                    {pos.changeDue > 0.009 ? (
                      <div className={styles.totalsRow}>
                        <span>Cambio</span>
                        <strong className={styles.totalsOk}>
                          {money(pos.changeDue)}
                        </strong>
                      </div>
                    ) : null}
                    <div className={styles.totalsGrand}>
                      <span>Total</span>
                      <span>{money(pos.totals.total)}</span>
                    </div>
                    <PosCostSummary
                      compact
                      summary={pos.cartCostSummary.summary}
                      missingCount={pos.cartCostSummary.missing}
                    />
                  </div>

                  <div className={styles.checkoutZone}>
                    <div className={styles.toolbarRow}>
                      <strong className={styles.checkoutZoneTitle}>
                        <Banknote size={14} /> Formas de pago
                      </strong>
                      <button
                        type="button"
                        className={styles.addPaymentBtn}
                        onClick={() => pos.addPayment("efectivo_sucursal")}
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        Agregar pago
                      </button>
                    </div>
                    {pos.payments.length > 0 ? (
                      <div className={styles.payList}>
                        {pos.payments.map((p) => (
                          <div key={p.id} className={styles.payLine}>
                            <TextField
                              select
                              size="small"
                              label="Forma de pago"
                              value={p.method}
                              onChange={(e) =>
                                pos.updatePayment(p.id, {
                                  method: e.target.value as PosPaymentMethod,
                                })
                              }
                              className={styles.payLineMethod}
                              fullWidth
                              sx={fieldSx}
                            >
                              {POS_PAYMENT_OPTIONS.map((m) => (
                                <MenuItem key={m} value={m}>
                                  {POS_PAYMENT_LABELS[m]}
                                </MenuItem>
                              ))}
                            </TextField>
                            <PosNumberField
                              className={styles.payLineAmount}
                              label={
                                p.method === "efectivo_sucursal" ||
                                p.method === "otro"
                                  ? "Monto recibido"
                                  : "Monto a cobrar"
                              }
                              value={p.amount ?? ""}
                              emptyAs=""
                              onCommit={(raw) => {
                                if (raw === "" || raw === ".") {
                                  pos.updatePayment(p.id, { amount: null });
                                  return;
                                }
                                const n = Number(raw);
                                pos.updatePayment(p.id, {
                                  amount:
                                    Number.isFinite(n) && n >= 0 ? n : null,
                                });
                              }}
                            />
                            <TextField
                              size="small"
                              label={
                                p.method === "otro"
                                  ? "Especificar método"
                                  : "Referencia"
                              }
                              value={p.reference}
                              onChange={(e) =>
                                pos.updatePayment(p.id, {
                                  reference: e.target.value,
                                })
                              }
                              required={p.method === "otro"}
                              error={
                                p.method === "otro" &&
                                p.reference.trim().length > 0 &&
                                p.reference.trim().length < 2
                              }
                              helperText={
                                p.method === "otro" &&
                                p.reference.trim().length > 0 &&
                                p.reference.trim().length < 2
                                  ? "Mínimo 2 caracteres"
                                  : undefined
                              }
                              placeholder={
                                p.method === "otro"
                                  ? "Ej. Vale de despensa, depósito…"
                                  : undefined
                              }
                              className={styles.payLineReference}
                              fullWidth
                              sx={fieldSx}
                            />
                            <div className={styles.payLineRemove}>
                              <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() => pos.removePayment(p.id)}
                                aria-label="Quitar forma de pago"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.payHint}>
                        Agrega al menos una forma de pago para cobrar.
                      </p>
                    )}

                    <label
                      className={`${styles.facturaCheck} ${
                        pos.requiredFactura ? styles.facturaCheckActive : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={pos.requiredFactura}
                        onChange={(e) =>
                          pos.setRequiredFactura(e.target.checked)
                        }
                      />
                      <span className={styles.facturaCheckBody}>
                        <span className={styles.facturaCheckTitle}>
                          <FileText size={15} strokeWidth={2.4} />
                          Requiere factura
                        </span>
                        <span className={styles.facturaCheckHint}>
                          {pos.requiredFactura
                            ? "Esta venta quedará marcada para facturar"
                            : "Actívalo si el cliente necesita factura"}
                        </span>
                      </span>
                    </label>

                    <TextField
                      className={styles.saleNotesField}
                      fullWidth
                      size="small"
                      label="Notas de la venta"
                      value={pos.notes}
                      onChange={(e) => pos.setNotes(e.target.value)}
                      multiline
                      minRows={3}
                      maxRows={8}
                      placeholder="Observaciones de la venta (opcional)"
                      sx={fieldSx}
                    />
                  </div>
                </div>

                <div className={styles.cartChargeBar}>
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    disabled={
                      pos.charging ||
                      pos.cart.length === 0 ||
                      (Boolean(pos.guestPhone.trim()) && !pos.phoneValid) ||
                      (pos.customerName.trim().length > 0 &&
                        pos.customerName.trim().length < 2) ||
                      pos.payments.length === 0 ||
                      !pos.settlement.balanced ||
                      pos.payments.some(
                        (p) =>
                          p.method === "otro" &&
                          p.reference.trim().length < 2,
                      )
                    }
                    onClick={() => {
                      (document.activeElement as HTMLElement | null)?.blur?.();
                      void pos.charge();
                    }}
                  >
                    {pos.charging
                      ? "Registrando venta…"
                      : pos.remaining > 0.009
                        ? `Falta ${money(pos.remaining)}`
                        : pos.changeDue > 0.009
                          ? `Cobrar · cambio ${money(pos.changeDue)}`
                          : `Cobrar ${money(pos.totals.total)}`}
                  </button>
                </div>
                </div>

                {pos.lastSale ? (
                  <div className={styles.postSaleBar}>
                    <div className={styles.postSaleInfo}>
                      <strong>Última venta {formatPosFolio(pos.lastSale.folio)}</strong>
                      <span>
                        {money(pos.lastSale.total)} ·{" "}
                        {statusLabel(pos.lastSale.status)}
                        {pos.lastSale.quoteNumber
                          ? ` · Cotización ${pos.lastSale.quoteNumber}`
                          : ""}
                      </span>
                    </div>
                    <div className={styles.postSaleActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() =>
                          pos.openTicket(pos.lastSale!.idPosSale, {
                            folio: pos.lastSale!.folio,
                            createdAt: pos.lastSale!.createdAt,
                          })
                        }
                      >
                        <Printer size={14} />
                        Imprimir ticket
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.setTicketOpen(true)}
                      >
                        Ver resumen
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
            </div>
          </div>
          </div>
        ) : pos.tab === "caja" ? (
          <div className={`${styles.posTabBody} ${styles.cashLayout}`}>
            <section className={styles.cashPanel}>
              <div className={styles.cashPanelHead}>
                <div className={styles.cashPanelHeadRow}>
                  <div>
                    <p className={styles.panelEyebrow}>Efectivo</p>
                    <h2>
                      <Wallet size={20} strokeWidth={2.25} />
                      Control de caja
                    </h2>
                    <p>
                      Abre con fondo, registra entradas/salidas y cierra con
                      corte. Obligatorio para cobros en efectivo.
                    </p>
                  </div>
                  {pos.branchId &&
                  !(pos.cashLoading || pos.cashSync === "loading") ? (
                    <span
                      className={`${styles.cashLivePill} ${
                        pos.cashOpen
                          ? styles.cashLivePillOpen
                          : styles.cashLivePillClosed
                      }`}
                    >
                      <span className={styles.cashLiveDot} />
                      {pos.cashOpen ? "Sesión abierta" : "Caja cerrada"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={styles.cashPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Caja no disponible"
                    description="No se pudo resolver la bodega de cobro. Recarga la página o revisa que exista la bodega leon2."
                  />
                ) : pos.cashLoading || pos.cashSync === "loading" ? (
                  <div className={styles.cashLoadingBlock}>
                    <CircularProgress sx={{ color: "#bb3d4b" }} />
                    <p>Verificando si hay caja abierta…</p>
                  </div>
                ) : pos.cashSync === "error" && !pos.cashOpen ? (
                  <div className={styles.cashClosedCard}>
                    <EmptyState
                      title="No se pudo verificar la caja"
                      description={
                        pos.cashSyncMessage ||
                        "Un fallo de red no significa que la caja esté cerrada. Reintenta antes de abrir otra sesión."
                      }
                    />
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      disabled={pos.cashLoading}
                      onClick={() => void pos.loadCashStatus({ retries: 3 })}
                    >
                      {pos.cashLoading
                        ? "Verificando…"
                        : "Reintentar verificación"}
                    </button>
                    <p className={styles.cashHint}>
                      Si acabas de abrir caja y ves esto, no abras otra:
                      reintenta o espera unos segundos.
                    </p>
                  </div>
                ) : !pos.cashOpen ? (
                  <div className={styles.cashClosedCard}>
                    <div>
                      <h3>Abrir turno de caja</h3>
                      <p>
                        Indica el fondo inicial en efectivo para empezar a
                        cobrar en mostrador.
                      </p>
                    </div>
                    <PosNumberField
                      label="Efectivo inicial (fondo)"
                      value={pos.openingFloat}
                      emptyAs=""
                      onCommit={(raw) => pos.setOpeningFloat(raw)}
                      sx={{ ...fieldSx, maxWidth: 260 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Notas (opcional)"
                      value={pos.cashNotes}
                      onChange={(e) => pos.setCashNotes(e.target.value)}
                      multiline
                      minRows={3}
                      maxRows={8}
                      placeholder="Observaciones al abrir caja (opcional)"
                      sx={fieldSx}
                    />
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      disabled={pos.cashBusy}
                      onClick={() => void pos.openCash()}
                    >
                      {pos.cashBusy ? "Abriendo…" : "Abrir caja"}
                    </button>
                  </div>
                ) : (
                  <div className={styles.cashForm}>
                    {pos.cashSync === "error" ? (
                      <div
                        className={styles.cashBanner}
                        style={{ marginBottom: 0 }}
                      >
                        <Wallet size={16} />
                        <span>
                          {pos.cashSyncMessage ||
                            "Sesión abierta según el último dato local; no se pudo confirmar con el servidor."}
                        </span>
                        <div className={styles.cashBannerActions}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={pos.cashLoading}
                            onClick={() =>
                              void pos.loadCashStatus({ retries: 3 })
                            }
                          >
                            Reintentar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.cashHero}>
                      <div className={styles.cashHeroTop}>
                        <div>
                          <p className={styles.cashHeroLabel}>
                            Efectivo esperado
                          </p>
                          <p className={styles.cashHeroAmount}>
                            {money(pos.cashExpected ?? 0)}
                          </p>
                        </div>
                        <div className={styles.cashHeroIcon} aria-hidden>
                          <CircleDollarSign size={22} strokeWidth={2.25} />
                        </div>
                      </div>
                      <div className={styles.cashMetaGrid}>
                        <div className={styles.cashMetaChip}>
                          <span>Sesión</span>
                          <strong>#{pos.cashSession?.idCashSession}</strong>
                        </div>
                        <div className={styles.cashMetaChip}>
                          <span>Abierta por</span>
                          <strong>
                            {pos.cashSession?.openedByName || "—"}
                          </strong>
                        </div>
                        <div className={styles.cashMetaChip}>
                          <span>Desde</span>
                          <strong>
                            {pos.cashSession?.openedAt
                              ? new Date(
                                  pos.cashSession.openedAt,
                                ).toLocaleString("es-MX")
                              : "—"}
                          </strong>
                        </div>
                        <div className={styles.cashMetaChip}>
                          <span>Fondo inicial</span>
                          <strong>
                            {money(pos.cashSession?.openingFloat || 0)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {pos.cashPaymentSummary ? (
                      <>
                        <h3 className={styles.cashSubhead}>
                          <Banknote size={14} />
                          Ventas del turno
                        </h3>
                        <div className={styles.cashStatGrid}>
                          <div className={styles.cashStatCard}>
                            <span>Ventas</span>
                            <strong>
                              {qty(pos.cashPaymentSummary.salesCount)}
                            </strong>
                          </div>
                          <div className={styles.cashStatCard}>
                            <span>Total cobrado</span>
                            <strong>
                              {money(pos.cashPaymentSummary.salesTotal)}
                            </strong>
                          </div>
                          {(
                            Object.entries(
                              pos.cashPaymentSummary.byMethod || {},
                            ) as [string, number][]
                          )
                            .filter(([, amount]) => Number(amount) > 0)
                            .map(([method, amount]) => (
                              <div
                                className={`${styles.cashStatCard} ${
                                  method === "efectivo_sucursal"
                                    ? styles.cashStatCardCash
                                    : ""
                                }`}
                                key={method}
                              >
                                <span>
                                  {POS_PAYMENT_LABELS[
                                    method as keyof typeof POS_PAYMENT_LABELS
                                  ] || method}
                                </span>
                                <strong>{money(amount)}</strong>
                              </div>
                            ))}
                          {(pos.cashPaymentSummary.cancelledCount || 0) > 0 ? (
                            <div className={styles.cashStatCard}>
                              <span>Canceladas</span>
                              <strong>
                                {pos.cashPaymentSummary.cancelledCount}
                              </strong>
                            </div>
                          ) : null}
                        </div>
                        <p className={styles.cashHint}>
                          El efectivo esperado del cajón usa: fondo + entradas +
                          ventas en efectivo − salidas − cancelaciones.
                        </p>
                      </>
                    ) : null}

                    <div className={styles.cashActionCard}>
                      <div className={styles.cashActionCardHead}>
                        <div>
                          <h3>Movimientos de efectivo</h3>
                          <p>
                            Solo cuando el dinero entra o sale del cajón sin
                            cobrar un producto.
                          </p>
                        </div>
                        <span className={styles.cashActionBadge}>Sin venta</span>
                      </div>
                      <div className={styles.cashMoveGrid}>
                        <PosNumberField
                          label="Monto en efectivo ($)"
                          value={pos.cashMoveAmount}
                          emptyAs=""
                          onCommit={(raw) => pos.setCashMoveAmount(raw)}
                        />
                        <TextField
                          size="small"
                          label="Motivo del movimiento"
                          placeholder="Ej. Fondo extra / gasto de papelería"
                          value={pos.cashMoveReason}
                          onChange={(e) =>
                            pos.setCashMoveReason(e.target.value)
                          }
                          helperText="Obligatorio. Explica por qué (mín. 5 caracteres)."
                          sx={fieldSx}
                        />
                      </div>
                      <div className={styles.cashMoveActions}>
                        <button
                          type="button"
                          className={styles.cashMoveBtnIn}
                          disabled={pos.cashBusy}
                          onClick={() => void pos.addCashMovement("cash_in")}
                          title="Suma dinero al cajón (no es una venta)"
                        >
                          <ArrowDownToLine size={16} strokeWidth={2.4} />
                          Meter efectivo
                        </button>
                        <button
                          type="button"
                          className={styles.cashMoveBtnOut}
                          disabled={pos.cashBusy}
                          onClick={() => void pos.addCashMovement("cash_out")}
                          title="Quita dinero del cajón (no es cancelación de venta)"
                        >
                          <ArrowUpFromLine size={16} strokeWidth={2.4} />
                          Sacar efectivo
                        </button>
                      </div>
                    </div>

                    <div className={styles.cashActionCard}>
                      <div className={styles.cashActionCardHead}>
                        <div>
                          <h3>Corte de caja</h3>
                          <p>
                            Cuenta el efectivo del cajón y cierra el turno.
                          </p>
                        </div>
                        <span className={styles.cashActionBadge}>Cierre</span>
                      </div>
                      <PosNumberField
                        label="Efectivo contado"
                        value={pos.closingCounted}
                        emptyAs=""
                        onCommit={(raw) => pos.setClosingCounted(raw)}
                        sx={{ ...fieldSx, maxWidth: 260 }}
                      />
                      {(() => {
                        const counted = Number(pos.closingCounted);
                        const expected = Number(pos.cashExpected ?? 0);
                        if (
                          !Number.isFinite(counted) ||
                          pos.closingCounted === ""
                        )
                          return null;
                        const diff =
                          Math.round(
                            (counted - expected + Number.EPSILON) * 100,
                          ) / 100;
                        const hasDiff = Math.abs(diff) > 0.009;
                        return (
                          <div className={styles.cashDiffBox}>
                            <div className={styles.cashDiffRow}>
                              <span>Esperado</span>
                              <strong>{money(expected)}</strong>
                            </div>
                            <div className={styles.cashDiffRow}>
                              <span>Contado</span>
                              <strong>{money(counted)}</strong>
                            </div>
                            <div
                              className={`${styles.cashDiffGrand} ${
                                hasDiff
                                  ? styles.cashDiffWarn
                                  : styles.cashDiffOk
                              }`}
                            >
                              <span>Diferencia</span>
                              <span>
                                {money(diff)}
                                {hasDiff
                                  ? diff > 0
                                    ? " (sobra)"
                                    : " (falta)"
                                  : " (cuadrado)"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const counted = Number(pos.closingCounted);
                        const expected = Number(pos.cashExpected ?? 0);
                        const hasDiff =
                          pos.closingCounted !== "" &&
                          Number.isFinite(counted) &&
                          Math.abs(counted - expected) > 0.009;
                        if (!hasDiff) return null;
                        return (
                          <TextField
                            fullWidth
                            size="small"
                            required
                            label="Motivo del descuadre"
                            value={pos.differenceReason}
                            onChange={(e) =>
                              pos.setDifferenceReason(e.target.value)
                            }
                            helperText="Obligatorio si contado ≠ esperado (mín. 5 caracteres)."
                            sx={fieldSx}
                          />
                        );
                      })()}
                      <TextField
                        fullWidth
                        size="small"
                        label="Notas de cierre (opcional)"
                        value={pos.cashNotes}
                        onChange={(e) => pos.setCashNotes(e.target.value)}
                        multiline
                        minRows={3}
                        maxRows={8}
                        placeholder="Observaciones al cerrar caja (opcional)"
                        sx={fieldSx}
                      />
                      <button
                        type="button"
                        className={styles.chargeBtn}
                        disabled={pos.cashBusy}
                        onClick={() => void pos.closeCash()}
                      >
                        {pos.cashBusy ? "Cerrando…" : "Cerrar caja (corte)"}
                      </button>
                    </div>

                    {(pos.cashSession?.movements?.length || 0) > 0 ? (
                      <>
                        <h3 className={styles.cashSubhead}>
                          <Clock3 size={14} />
                          Movimientos de la sesión
                        </h3>
                        <div
                          className={`${styles.scrollPanelSm} ${styles.cashMovementsTableWrap}`}
                        >
                          <table className={styles.historyTable}>
                            <thead>
                              <tr>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Monto</th>
                                <th>Motivo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pos.cashSession!.movements!.map((m) => (
                                <tr key={m.idCashMovement}>
                                  <td>
                                    {new Date(m.createdAt).toLocaleTimeString(
                                      "es-MX",
                                    )}
                                  </td>
                                  <td>
                                    {POS_CASH_MOVEMENT_LABELS[
                                      m.type as PosCashMovementType
                                    ] || m.type}
                                  </td>
                                  <td>{money(m.amount)}</td>
                                  <td>{m.reason || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section
              className={`${styles.cashPanel} ${styles.cashSessionsPanel}`}
            >
              <div className={styles.cashPanelHead}>
                <p className={styles.panelEyebrow}>Turnos</p>
                <h2>Sesiones recientes</h2>
                <p>
                  Historial de aperturas y cortes. Clic en una fila para ver
                  movimientos.
                </p>
              </div>
              <div className={styles.cashPanelBody}>
                {!pos.branchId ? (
                  <EmptyState
                    title="Caja no disponible"
                    description="No se pudo resolver la bodega de cobro."
                  />
                ) : pos.cashSessionsLoading && pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Cargando…"
                    description="Consultando sesiones de caja."
                  />
                ) : pos.cashSessions.length === 0 ? (
                  <EmptyState
                    title="Sin sesiones"
                    description="Aún no hay aperturas ni cortes. Abre caja a la izquierda para empezar el turno."
                  />
                ) : (
                  <>
                    {pos.cashSessionsTotal > 0 ? (
                      <div style={{ marginBottom: 12 }}>
                        <ModernPagination
                          page={pos.cashSessionsPage}
                          pageCount={Math.max(pos.cashSessionsTotalPages, 1)}
                          totalItems={pos.cashSessionsTotal}
                          pageSize={10}
                          scrollOnChange={false}
                          onPageChange={(p) => pos.goCashSessionsPage(p)}
                        />
                      </div>
                    ) : null}
                    <div
                      ref={cashSessionsListRef}
                      className={styles.cashSessionList}
                    >
                      {pos.cashSessions.map((s) => {
                        const diff = s.difference != null ? Number(s.difference) : null;
                        const hasDiff =
                          diff != null && Math.abs(diff) > 0.009;
                        return (
                          <button
                            type="button"
                            key={s.idCashSession}
                            className={styles.cashSessionRow}
                            onClick={() =>
                              void pos.openCashSessionDetail(s.idCashSession)
                            }
                            title="Ver detalle de movimientos"
                          >
                            <span className={styles.cashSessionId}>
                              #{s.idCashSession}
                            </span>
                            <div className={styles.cashSessionMain}>
                              <strong>
                                <Clock3 size={13} strokeWidth={2.4} />
                                {new Date(s.openedAt).toLocaleString("es-MX")}
                              </strong>
                              <span>
                                {s.status === "open" ? "En curso" : "Cerrada"}
                                {s.expectedCash != null
                                  ? ` · Esperado ${money(s.expectedCash)}`
                                  : ""}
                              </span>
                            </div>
                            <div className={styles.cashSessionSide}>
                              <span
                                className={`${styles.badge} ${
                                  s.status === "open"
                                    ? styles.badgeCompleted
                                    : styles.badgePending
                                }`}
                              >
                                {s.status === "open" ? "Abierta" : "Cerrada"}
                              </span>
                              {diff != null ? (
                                <span
                                  className={
                                    hasDiff
                                      ? styles.cashSessionDiffNeg
                                      : styles.cashSessionDiffOk
                                  }
                                >
                                  {hasDiff
                                    ? `Dif. ${money(diff)}`
                                    : "Cuadrada"}
                                </span>
                              ) : (
                                <ChevronRight
                                  size={16}
                                  className={styles.cashSessionChevron}
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {pos.cashSessionsTotal > 0 ? (
                      <div style={{ marginTop: 4 }}>
                        <ModernPagination
                          page={pos.cashSessionsPage}
                          pageCount={Math.max(pos.cashSessionsTotalPages, 1)}
                          totalItems={pos.cashSessionsTotal}
                          pageSize={10}
                          scrollTargetRef={cashSessionsListRef}
                          onPageChange={(p) => pos.goCashSessionsPage(p)}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            <section
              className={`${styles.cashPanel} ${styles.cashHwPanel}`}
            >
              <div className={styles.cashPanelHead}>
                <p className={styles.panelEyebrow}>Hardware</p>
                <h2>
                  <Printer size={20} strokeWidth={2.25} />
                  Impresora térmica y cajón
                </h2>
                <p>
                  Instala QZ Tray en esta PC, permite este sitio y elige la
                  impresora térmica. En cobros con efectivo el ticket sale primero
                  y el cajón se abre después, cuando la impresora ya está lista.
                </p>
              </div>
              <div className={styles.cashPanelBody}>
                <div className={styles.cashHwGrid}>
                  <div className={styles.cashForm}>
                    <div className={styles.cashHwControls}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={pos.qzBusy}
                        onClick={() => void pos.refreshQzPrinters()}
                      >
                        {pos.qzBusy ? "Buscando…" : "Detectar impresoras"}
                      </button>
                      <TextField
                        select
                        size="small"
                        label="Impresora"
                        value={pos.qzSettings.printerName}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            printerName: e.target.value,
                          })
                        }
                        sx={{ ...fieldSx, minWidth: 260 }}
                      >
                        <MenuItem value="">
                          <em>Sin seleccionar</em>
                        </MenuItem>
                        {(pos.qzPrinters.length
                          ? pos.qzPrinters
                          : pos.qzSettings.printerName
                            ? [pos.qzSettings.printerName]
                            : []
                        ).map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="Tipo de comando del cajón"
                        value={pos.qzSettings.drawerDialect}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            drawerDialect: e.target.value as "epson" | "star",
                          })
                        }
                        sx={{ ...fieldSx, minWidth: 180 }}
                      >
                        <MenuItem value="epson">Epson / ESC-POS</MenuItem>
                        <MenuItem value="star">Star</MenuItem>
                      </TextField>
                    </div>
                    <p className={styles.cashHint}>
                      Elige la impresora térmica (Epson/Star). No uses
                      «Microsoft Print to PDF» ni similares: el ticket raw no
                      es un PDF. Para PDF usa la vista previa HTML.
                    </p>
                    <div className={styles.cashMoveActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={pos.qzBusy || !pos.qzSettings.printerName}
                        onClick={() => void pos.testQzPrint()}
                      >
                        Probar ticket
                      </button>
                      <button
                        type="button"
                        className={styles.drawerBtn}
                        disabled={pos.qzBusy || !pos.qzSettings.printerName}
                        onClick={() => void pos.testQzDrawer()}
                      >
                        Abrir cajón de dinero
                      </button>
                    </div>
                  </div>
                  <div className={styles.cashHwChecks}>
                    <label className={styles.cashHwCheck}>
                      <input
                        type="checkbox"
                        checked={pos.qzSettings.autoPrintOnCharge}
                        onChange={(e) =>
                          pos.updateQzSettings({
                            autoPrintOnCharge: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Imprimir ticket al cobrar
                        <small>Envía ESC/POS al cobrar si QZ está activo.</small>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : pos.tab === "garantias" ? (
          <section className={`${styles.posTabBody} ${styles.posPanel}`}>
            <div className={styles.posPanelHead}>
              <div className={styles.historyHeadRow}>
                <div>
                  <p className={styles.panelEyebrow}>Series</p>
                  <h2>
                    <Shield size={18} strokeWidth={2.25} />
                    Garantías
                  </h2>
                  <p>
                    Ventas con número de serie: busca por folio, cliente o
                    serie e imprime la hoja de garantía.
                  </p>
                </div>
                {!pos.warrantiesLoading && pos.warrantiesTotal > 0 ? (
                  <div className={styles.historyStat}>
                    <span className={styles.historyStatLabel}>Resultados</span>
                    <strong>{qty(pos.warrantiesTotal)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.historyFilters}>
                <TextField
                  size="small"
                  label="Cliente"
                  placeholder="Nombre del cliente"
                  value={pos.warrantyCustomer}
                  onChange={(e) => pos.setWarrantyCustomer(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 180px" }}
                />
                <TextField
                  size="small"
                  label="Folio"
                  placeholder="3414"
                  value={pos.warrantyFolio}
                  onChange={(e) => pos.setWarrantyFolio(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  label="Nº serie"
                  placeholder="Mín. 3 caracteres"
                  title="Guiones, espacios y signos no importan"
                  value={pos.warrantySerial}
                  onChange={(e) => pos.setWarrantySerial(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 180px" }}
                />
                <TextField
                  size="small"
                  label="Venta"
                  placeholder="#123 o 123"
                  value={pos.warrantySaleId}
                  onChange={(e) => pos.setWarrantySaleId(e.target.value)}
                  inputProps={{ inputMode: "numeric" }}
                  sx={{ ...fieldSx, minWidth: 120, flex: "0 1 120px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Desde"
                  value={pos.warrantyFrom}
                  onChange={(e) => pos.setWarrantyFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Hasta"
                  value={pos.warrantyTo}
                  onChange={(e) => pos.setWarrantyTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={
                    pos.warrantyFrom ? { min: pos.warrantyFrom } : undefined
                  }
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <div className={styles.historyFilterActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.clearWarrantyFilters()}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {pos.warrantiesLoading ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 40 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.warranties.length === 0 ? (
                <EmptyState
                  title="Sin garantías"
                  description="Aún no hay ventas completadas con números de serie. Al cobrar productos con serie aparecerán aquí."
                />
              ) : (
                <>
                  {pos.warrantiesTotal > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <ModernPagination
                        page={pos.warrantiesPage}
                        pageCount={Math.max(pos.warrantiesTotalPages, 1)}
                        totalItems={pos.warrantiesTotal}
                        pageSize={15}
                        scrollOnChange={false}
                        onPageChange={(p) => pos.goWarrantiesPage(p)}
                      />
                    </div>
                  ) : null}
                  <div
                    ref={warrantiesTableRef}
                    className={styles.scrollPanel}
                  >
                  <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>ID venta</th>
                      <th>Folio</th>
                      <th>Bodega</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.warranties.map((sale) => (
                      <tr key={sale.idPosSale}>
                        <td>#{sale.idPosSale}</td>
                        <td>{formatPosFolio(sale.folio)}</td>
                        <td>
                          {formatPosBranchUiLabel({
                            name: sale.branchName,
                            city: sale.branchCity,
                            fallback: "—",
                          })}
                        </td>
                        <td>
                          {new Date(sale.createdAt).toLocaleString("es-MX", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}
                        </td>
                        <td>{sale.customerName || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              title="Imprimir hoja de garantía"
                              onClick={() =>
                                pos.openWarrantySheet(sale.idPosSale)
                              }
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              title="Ver detalle"
                              onClick={() =>
                                void pos.openWarrantyDetail(sale.idPosSale)
                              }
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                  </div>
                  {pos.warrantiesTotal > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      <ModernPagination
                        page={pos.warrantiesPage}
                        pageCount={Math.max(pos.warrantiesTotalPages, 1)}
                        totalItems={pos.warrantiesTotal}
                        pageSize={15}
                        scrollTargetRef={warrantiesTableRef}
                        onPageChange={(p) => pos.goWarrantiesPage(p)}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        ) : (
          <section className={`${styles.posTabBody} ${styles.posPanel}`}>
            <div className={styles.posPanelHead}>
              <div className={styles.historyHeadRow}>
                <div>
                  <p className={styles.panelEyebrow}>Ventas</p>
                  <h2>
                    <History size={18} strokeWidth={2.25} />
                    Historial de ventas
                  </h2>
                  <p>
                    Consulta, reimpresión de ticket y cancelaciones con
                    restauración de inventario.
                  </p>
                </div>
                {!pos.historyLoading && pos.historyTotal > 0 ? (
                  <div className={styles.historyStat}>
                    <span className={styles.historyStatLabel}>Resultados</span>
                    <strong>{qty(pos.historyTotal)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.posPanelBody}>
              <div className={styles.historyFilters}>
                <TextField
                  size="small"
                  label="Folio"
                  placeholder="3414"
                  value={pos.historyFolio}
                  onChange={(e) => pos.setHistoryFolio(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 160, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  label="Cliente"
                  placeholder="Nombre del cliente"
                  value={pos.historyCustomer}
                  onChange={(e) => pos.setHistoryCustomer(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 180, flex: "1 1 180px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Desde"
                  value={pos.historyFrom}
                  onChange={(e) => pos.setHistoryFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Hasta"
                  value={pos.historyTo}
                  onChange={(e) => pos.setHistoryTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={
                    pos.historyFrom ? { min: pos.historyFrom } : undefined
                  }
                  sx={{ ...fieldSx, minWidth: 150, flex: "1 1 140px" }}
                />
                <TextField
                  select
                  size="small"
                  label="Estado"
                  value={pos.historyStatus}
                  onChange={(e) => pos.setHistoryStatus(e.target.value)}
                  sx={{ ...fieldSx, minWidth: 160, flex: "1 1 140px" }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                  <MenuItem value="pending_payment">Pendiente de pago</MenuItem>
                </TextField>
                <div className={styles.historyFilterActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.clearHistoryFilters()}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {pos.historyLoading ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 48 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : pos.history.length === 0 ? (
                <EmptyState
                  title="Sin ventas"
                  description="Aún no hay ventas POS con estos filtros."
                />
              ) : (
                <>
                  {pos.historyTotal > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <ModernPagination
                        page={pos.historyPage}
                        pageCount={Math.max(pos.historyTotalPages, 1)}
                        totalItems={pos.historyTotal}
                        pageSize={15}
                        scrollOnChange={false}
                        onPageChange={(p) => pos.goHistoryPage(p)}
                      />
                    </div>
                  ) : null}
                  <div ref={historyListRef} className={styles.historyList}>
                    {pos.history.map((sale) => {
                      const paySummary =
                        sale.payments?.length > 0
                          ? sale.payments
                              .map((p) =>
                                formatPosPaymentLabel(p.method, p.reference),
                              )
                              .join(" · ")
                          : "Sin pagos";
                      const itemCount = sale.items?.length || 0;
                      const qtyUnits = (sale.items || []).reduce(
                        (sum, it) => sum + Number(it.quantity || 0),
                        0,
                      );
                      const pieces = qtyUnits > 0 ? qtyUnits : itemCount;
                      const branchLabel =
                        sale.branchName || sale.branchCity
                          ? formatPosBranchUiLabel({
                              name: sale.branchName,
                              city: sale.branchCity,
                            })
                          : null;
                      const whenLabel = formatPosSaleDateTime(sale.createdAt);
                      return (
                        <article
                          key={sale.idPosSale}
                          className={`${styles.historyCard} ${
                            sale.status === "cancelled"
                              ? styles.historyCardCancelled
                              : sale.status === "pending_payment"
                                ? styles.historyCardPending
                                : styles.historyCardCompleted
                          }`}
                        >
                          <div
                            className={styles.historyAccent}
                            aria-hidden
                          />
                          <div className={styles.historyCardBody}>
                            <div className={styles.historyCardHeader}>
                              <div className={styles.historyIdentity}>
                                <span className={styles.historyFolio}>
                                  {formatPosFolio(sale.folio)}
                                </span>
                                <span
                                  className={`${styles.badge} ${statusBadge(sale.status)}`}
                                >
                                  {statusLabel(sale.status)}
                                </span>
                                <FacturaFlag
                                  required={Number(sale.requiredFactura) === 1}
                                />
                              </div>
                              <div className={styles.historyTotal}>
                                {money(sale.total)}
                              </div>
                            </div>

                            <div className={styles.historyCustomer}>
                              {sale.customerName?.trim() || "—"}
                            </div>

                            <div className={styles.historyFacts}>
                              <span>{whenLabel}</span>
                              <span className={styles.historyFactSep} />
                              <span>{paySummary}</span>
                              <span className={styles.historyFactSep} />
                              <span>
                                {qty(pieces)}{" "}
                                {pieces === 1 ? "pieza" : "piezas"}
                              </span>
                              {branchLabel ? (
                                <>
                                  <span className={styles.historyFactSep} />
                                  <span>{branchLabel}</span>
                                </>
                              ) : null}
                              <span className={styles.historyFactSep} />
                              <span>PCinBOX</span>
                              {sale.customerPhone ? (
                                <>
                                  <span className={styles.historyFactSep} />
                                  <span>{sale.customerPhone}</span>
                                </>
                              ) : null}
                              {sale.quoteNumber ? (
                                <>
                                  <span className={styles.historyFactSep} />
                                  <span>Cot. {sale.quoteNumber}</span>
                                </>
                              ) : null}
                            </div>

                            <div className={styles.historyCardActions}>
                              <button
                                type="button"
                                className={styles.historyActionBtn}
                                onClick={() =>
                                  void pos.openDetail(sale.idPosSale)
                                }
                              >
                                <Eye size={15} strokeWidth={2.25} />
                                Detalle
                              </button>
                              <button
                                type="button"
                                className={styles.historyActionBtnPrimary}
                                onClick={() =>
                                  pos.openTicket(sale.idPosSale, {
                                    folio: sale.folio,
                                    createdAt: sale.createdAt,
                                  })
                                }
                              >
                                <Printer size={15} strokeWidth={2.25} />
                                Ticket
                              </button>
                              <button
                                type="button"
                                className={styles.historyActionBtn}
                                onClick={() =>
                                  pos.downloadTicketPdf(sale.idPosSale, {
                                    folio: sale.folio,
                                    createdAt: sale.createdAt,
                                  })
                                }
                              >
                                <FileDown size={15} strokeWidth={2.25} />
                                Ticket PDF
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {pos.historyTotal > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      <ModernPagination
                        page={pos.historyPage}
                        pageCount={Math.max(pos.historyTotalPages, 1)}
                        totalItems={pos.historyTotal}
                        pageSize={15}
                        scrollTargetRef={historyListRef}
                        onPageChange={(p) => pos.goHistoryPage(p)}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        )}

        {pos.warrantyDetail && typeof document !== "undefined"
          ? createPortal(
              <div
                className={`${styles.drawer} ${styles.posDrawerPortal}`}
                role="dialog"
                aria-modal="true"
                onClick={() => pos.setWarrantyDetail(null)}
              >
                <div
                  className={`${styles.drawerPanel} ${styles.detailDrawer} ${styles.warrantyDrawer}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.detailHero}>
                    <div className={styles.detailHeroTop}>
                      <div>
                        <p className={styles.detailEyebrow}>
                          Detalle de garantía
                        </p>
                        <h3 className={styles.detailFolio}>
                          Venta #{pos.warrantyDetail.idPosSale}
                        </h3>
                        <p className={styles.detailWhen}>
                          Folio{" "}
                          {formatPosFolio(pos.warrantyDetail.folio)} ·{" "}
                          {new Date(
                            pos.warrantyDetail.createdAt,
                          ).toLocaleString("es-MX")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => pos.setWarrantyDetail(null)}
                        aria-label="Cerrar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.warrantyDrawerScroll}>
                    <div className={styles.detailItems}>
                      {pos.warrantyDetail.items.map((it) => {
                        const sku = displayProductCode(it.productSku);
                        const upc = displayProductCode(it.productUpc);
                        return (
                          <div
                            key={it.idPosSaleItem}
                            className={styles.detailItem}
                          >
                            {productThumb(
                              resolveProductImage(it.productImage),
                            )}
                            <div className={styles.detailItemMain}>
                              <strong
                                className={styles.detailItemName}
                                title={it.productName}
                              >
                                <span className={styles.detailItemQty}>
                                  {qty(it.quantity)} ×
                                </span>{" "}
                                {clipText(it.productName, 90)}
                              </strong>
                              <div className={styles.detailItemMeta}>
                                {sku ? (
                                  <span title={`SKU: ${sku}`}>
                                    SKU: {clipText(sku, 28)}
                                  </span>
                                ) : null}
                                {upc ? (
                                  <span title={`UPC: ${upc}`}>
                                    UPC: {clipText(upc, 28)}
                                  </span>
                                ) : null}
                                <span>Precio: {money(it.unitPrice)}</span>
                                {Number(it.discountPct) > 0 ? (
                                  <span>
                                    Descuento {Number(it.discountPct)}%
                                  </span>
                                ) : null}
                                {it.branchLabel || it.branchName ? (
                                  <span
                                    title={`Bodega: ${formatPosBranchUiLabel({
                                      name: it.branchName,
                                      label: it.branchLabel,
                                      city: it.branchCity,
                                    })}`}
                                  >
                                    Bodega:{" "}
                                    {clipText(
                                      formatPosBranchUiLabel({
                                        name: it.branchName,
                                        label: it.branchLabel,
                                        city: it.branchCity,
                                      }),
                                      36,
                                    )}
                                  </span>
                                ) : null}
                              </div>
                              {it.serials && it.serials.length > 0 ? (
                                <div className={styles.detailSerialList}>
                                  {it.serials.map((s) => {
                                    const coverage = warrantyCoverageLabel(
                                      s.warrantyMode,
                                      s.warrantyMonths,
                                    );
                                    const snRaw = String(s.serialNumber || "");
                                    const sn = /^POS-W-\d+-\d+-\d+$/i.test(snRaw)
                                      ? ""
                                      : snRaw;
                                    return (
                                      <div
                                        key={s.idProductSerial}
                                        className={styles.detailSerialCard}
                                      >
                                        <strong
                                          title={
                                            sn ? `Serie: ${sn}` : undefined
                                          }
                                        >
                                          Serie: {clipText(sn, 40) || "—"}
                                        </strong>
                                        <span>Cobertura: {coverage}</span>
                                        {s.warrantyExpiresAt ? (
                                          <span>
                                            Garantía hasta:{" "}
                                            {new Date(
                                              s.warrantyExpiresAt,
                                            ).toLocaleDateString("es-MX")}
                                          </span>
                                        ) : null}
                                        {s.status ? (
                                          <span>
                                            Estado:{" "}
                                            {serialStatusLabel(s.status)}
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span>Sin serie registrada</span>
                              )}
                            </div>
                            <div className={styles.detailItemPrice}>
                              {money(it.lineTotal)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className={styles.warrantyDrawerFooter}>
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      onClick={() =>
                        pos.openWarrantySheet(pos.warrantyDetail!.idPosSale)
                      }
                    >
                      <Printer
                        size={14}
                        style={{ display: "inline", marginRight: 6 }}
                      />
                      Imprimir hoja de garantía
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}

        {pos.detailSale && typeof document !== "undefined"
          ? createPortal(
              <div
                className={`${styles.drawer} ${styles.posDrawerPortal}`}
                role="dialog"
                aria-modal="true"
                onClick={() => pos.setDetailSale(null)}
              >
                <div
                  className={`${styles.drawerPanel} ${styles.detailDrawer}`}
                  onClick={(e) => e.stopPropagation()}
                >
              <div className={styles.detailHero}>
                <div className={styles.detailHeroTop}>
                  <div>
                    <p className={styles.detailEyebrow}>Detalle de venta</p>
                    <h3 className={styles.detailFolio}>
                      {formatPosFolio(pos.detailSale.folio)}
                    </h3>
                    <p className={styles.detailWhen}>
                      {new Date(pos.detailSale.createdAt).toLocaleString(
                        "es-MX",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => pos.setDetailSale(null)}
                    aria-label="Cerrar"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.detailHeroBottom}>
                  <div className={styles.detailHeroFlags}>
                    <span
                      className={`${styles.badge} ${statusBadge(pos.detailSale.status)}`}
                    >
                      {statusLabel(pos.detailSale.status)}
                    </span>
                    <FacturaFlag
                      required={Number(pos.detailSale.requiredFactura) === 1}
                    />
                    {listSaleDeliveries(pos.detailSale).length > 0 ? (
                      <span className={styles.deliveryFlag}>Envío a domicilio</span>
                    ) : null}
                  </div>
                  <div className={styles.detailHeroTotal}>
                    <span>Total</span>
                    <strong>{money(pos.detailSale.total)}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.detailCost}>
                <PosCostSummary compact summary={pos.detailSale.costSummary} />
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Cliente</span>
                  <strong
                    title={pos.detailSale.customerName || undefined}
                  >
                    {clipText(pos.detailSale.customerName || "—", 48)}
                  </strong>
                  {pos.detailSale.customerPhone ? (
                    <span
                      className={styles.detailTileSub}
                      title={pos.detailSale.customerPhone}
                    >
                      {clipText(pos.detailSale.customerPhone, 32)}
                    </span>
                  ) : null}
                  {pos.detailSale.customerEmail ? (
                    <span
                      className={styles.detailTileSub}
                      title={pos.detailSale.customerEmail}
                    >
                      {clipText(pos.detailSale.customerEmail, 40)}
                    </span>
                  ) : null}
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Vendedor</span>
                  <strong>PCinBOX</strong>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Bodega / caja</span>
                  <strong
                    title={formatPosBranchUiLabel({
                      name: pos.detailSale.branchName,
                      city: pos.detailSale.branchCity,
                      fallback: "Bodega PCinBOX",
                    })}
                  >
                    {clipText(
                      formatPosBranchUiLabel({
                        name: pos.detailSale.branchName,
                        city: pos.detailSale.branchCity,
                        fallback: "Bodega PCinBOX",
                      }),
                      42,
                    )}
                  </strong>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.historyMetaLabel}>Resumen</span>
                  <strong>
                    {pos.detailSale.items.length} producto
                    {pos.detailSale.items.length === 1 ? "" : "s"}
                  </strong>
                  <div className={styles.detailMoneyStack}>
                    <span className={styles.detailMoneyLine}>
                      <span>Subtotal</span>
                      <strong>{money(pos.detailSale.subtotal)}</strong>
                    </span>
                    {Number(pos.detailSale.discountTotal) > 0 ? (
                      <span className={styles.detailMoneyLine}>
                        <span>Descuento</span>
                        <strong>−{money(pos.detailSale.discountTotal)}</strong>
                      </span>
                    ) : null}
                    {listSaleDeliveries(pos.detailSale).some(
                      (address) => Number(address.shippingCost) > 0,
                    ) ? (
                      <span className={styles.detailMoneyLine}>
                        <span>Envío</span>
                        <strong>
                          {money(
                            listSaleDeliveries(pos.detailSale).reduce(
                              (sum, address) =>
                                sum + Number(address.shippingCost || 0),
                              0,
                            ),
                          )}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {listSaleDeliveries(pos.detailSale).length > 0 ? (
                <div className={styles.detailSection}>
                  <div className={styles.detailSectionHead}>
                    <h4>Envío a domicilio</h4>
                    <span className={styles.detailSectionCount}>
                      {listSaleDeliveries(pos.detailSale).length} envío
                      {listSaleDeliveries(pos.detailSale).length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className={styles.detailDeliveries}>
                    {listSaleDeliveries(pos.detailSale).map((address, index, list) => (
                      <article
                        className={styles.deliveryItem}
                        key={`${address.postalCode}-${address.street}-${index}`}
                      >
                        <div className={styles.deliveryItemBody}>
                          <span className={styles.deliveryItemMark} aria-hidden>
                            <Truck size={20} />
                          </span>
                          <div className={styles.deliveryItemCopy}>
                            <div className={styles.deliveryItemHead}>
                              <span className={styles.deliveryItemKicker}>
                                {list.length > 1
                                  ? `Domicilio ${index + 1}`
                                  : "Domicilio"}
                              </span>
                            </div>
                            <strong className={styles.deliveryItemStreet}>
                              {address.street} #{address.noExt}
                              {address.noInt ? ` Int. ${address.noInt}` : ""}
                            </strong>
                            <p className={styles.deliveryItemPlace}>
                              Col. {address.cologne}
                              {" · "}
                              CP {address.postalCode}
                              {" · "}
                              {address.city}, {address.state}
                            </p>
                          </div>
                          <div className={styles.deliveryItemPrice}>
                            <span>Envío</span>
                            <strong>{money(address.shippingCost || 0)}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                className={`${styles.detailSection} ${styles.detailProductsSection}`}
              >
                <div className={styles.detailSectionHead}>
                  <h4>Productos</h4>
                  <span className={styles.detailSectionCount}>
                    {pos.detailSale.items.length} ítem
                    {pos.detailSale.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className={styles.detailItems}>
                  {pos.detailSale.items.map((it) => {
                    const sku = displayProductCode(it.productSku);
                    const upc = displayProductCode(it.productUpc);
                    const fullName = String(it.productName || "");
                    const nameShown = clipText(fullName, 90);
                    const branchShown =
                      it.branchLabel || it.branchName
                        ? formatPosBranchUiLabel({
                            name: it.branchName,
                            label: it.branchLabel,
                            city: it.branchCity,
                          })
                        : null;
                    return (
                      <div
                        key={it.idPosSaleItem}
                        className={styles.detailItem}
                      >
                        {productThumb(
                          resolveProductImage(it.productImage),
                          styles.detailItemImg,
                        )}
                        <div className={styles.detailItemMain}>
                          <strong
                            className={styles.detailItemName}
                            title={fullName}
                          >
                            <span className={styles.detailItemQty}>
                              {qty(it.quantity)} ×
                            </span>{" "}
                            {nameShown}
                            {it.serviceIntake?.equipment?.length ? (
                              <span className={styles.detailServiceBadge}>
                                Servicio
                              </span>
                            ) : null}
                          </strong>
                          <div className={styles.detailItemMeta}>
                            {sku ? (
                              <span title={`SKU: ${sku}`}>
                                SKU: {clipText(sku, 28)}
                              </span>
                            ) : null}
                            {upc ? (
                              <span title={`UPC: ${upc}`}>
                                UPC: {clipText(upc, 28)}
                              </span>
                            ) : null}
                            <span>P. unit: {money(it.unitPrice)}</span>
                            {Number(it.discountPct) > 0 ? (
                              <span>
                                Desc. {Number(it.discountPct)}%
                              </span>
                            ) : null}
                            {branchShown ? (
                              <span title={`Bodega: ${branchShown}`}>
                                Bodega: {clipText(branchShown, 36)}
                              </span>
                            ) : null}
                            {(() => {
                              const coverage = saleItemWarrantyLabel(it);
                              return coverage ? (
                                <span title={`Garantía: ${coverage}`}>
                                  Garantía: {coverage}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          {it.serials && it.serials.length > 0 ? (
                            <div className={styles.detailSerialList}>
                              {it.serials.map((s) => {
                                const snRaw = String(s.serialNumber || "");
                                const sn = /^POS-W-\d+-\d+-\d+$/i.test(snRaw)
                                  ? ""
                                  : snRaw;
                                const coverage = warrantyCoverageLabel(
                                  s.warrantyMode,
                                  s.warrantyMonths,
                                );
                                const hasCoverage =
                                  Boolean(String(s.warrantyMode || "").trim()) ||
                                  (s.warrantyMonths != null &&
                                    Number(s.warrantyMonths) > 0);
                                return (
                                  <div
                                    key={s.idProductSerial}
                                    className={styles.detailSerialCard}
                                  >
                                    <strong title={sn ? `Serie: ${sn}` : undefined}>
                                      Serie: {clipText(sn, 40) || "—"}
                                    </strong>
                                    {hasCoverage ? (
                                      <span>Cobertura: {coverage}</span>
                                    ) : null}
                                    {s.warrantyExpiresAt ? (
                                      <span>
                                        Garantía hasta:{" "}
                                        {new Date(
                                          s.warrantyExpiresAt,
                                        ).toLocaleDateString("es-MX")}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div className={styles.detailItemPrice}>
                          {money(it.lineTotal)}
                        </div>
                        {it.serviceIntake?.equipment?.length ? (
                          <div
                            className={`${styles.serviceIntakeDetail} ${styles.detailItemService}`}
                          >
                            <strong>Datos del Equipo y/o componente</strong>
                            {it.serviceIntake.equipment.map((eq, idx) => (
                              <div
                                key={`${it.idPosSaleItem}-eq-${idx}`}
                                className={styles.equipDescBlock}
                              >
                                <strong>
                                  {eq.description || "—"}
                                  {Number(eq.quantity) > 1
                                    ? ` (×${eq.quantity})`
                                    : ""}
                                </strong>
                                {eq.serialNumber ? (
                                  <p>
                                    <em>Nº serie:</em> {eq.serialNumber}
                                  </p>
                                ) : null}
                                {eq.physicalCondition ? (
                                  <p>
                                    <em>Estado físico:</em>{" "}
                                    {eq.physicalCondition}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                            {it.serviceIntake.failureOrRequestedService ? (
                              <p>
                                <em>Falla o Servicio solicitado:</em>{" "}
                                {it.serviceIntake.failureOrRequestedService}
                              </p>
                            ) : null}
                            {it.serviceIntake
                              .technicalObservationsOnReceipt ? (
                              <p>
                                <em>Observaciones Técnicas al Recibir:</em>{" "}
                                {
                                  it.serviceIntake
                                    .technicalObservationsOnReceipt
                                }
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionHead}>
                  <h4>Pagos</h4>
                  <span className={styles.detailSectionCount}>
                    {pos.detailSale.payments.length} pago
                    {pos.detailSale.payments.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className={styles.detailPayments}>
                  {pos.detailSale.payments.map((p) => {
                    const PaymentIcon = paymentDetailIcon(p.method);
                    const note = paymentDetailNote(p.method, p.reference);
                    return (
                      <div key={p.idPosPayment} className={styles.detailPaymentCard}>
                        <span className={styles.detailPaymentMark} aria-hidden>
                          <PaymentIcon size={18} />
                        </span>
                        <div className={styles.detailPaymentCopy}>
                          <strong>
                            {formatPosPaymentLabel(p.method, p.reference)}
                          </strong>
                          {note ? <span>{note}</span> : null}
                        </div>
                        <strong className={styles.detailPaymentAmount}>
                          {money(p.amount)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {pos.detailSale.notes ? (
                <div className={styles.detailSection}>
                  <h4>Notas</h4>
                  <p className={styles.detailNotes}>{pos.detailSale.notes}</p>
                </div>
              ) : null}

              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.chargeBtn}
                  style={{ marginTop: 0, width: "auto" }}
                  onClick={() =>
                    pos.openTicket(pos.detailSale!.idPosSale, {
                      folio: pos.detailSale!.folio,
                      createdAt: pos.detailSale!.createdAt,
                    })
                  }
                >
                  <Printer
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Imprimir ticket
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={{ marginTop: 0, width: "auto" }}
                  onClick={() =>
                    pos.downloadTicketPdf(pos.detailSale!.idPosSale, {
                      folio: pos.detailSale!.folio,
                      createdAt: pos.detailSale!.createdAt,
                    })
                  }
                >
                  <FileDown
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Ticket PDF
                </button>
              </div>

              {pos.detailSale.status !== "cancelled" ? (
                <div className={styles.detailCancelBox}>
                  {pos.cancelGate.allowed ? (
                    <>
                      <h4>Cancelación</h4>
                      <p className={styles.detailTileSub}>
                        Restaura inventario y registra el evento de auditoría.
                      </p>
                      <TextField
                        fullWidth
                        size="small"
                        label="Motivo de cancelación"
                        value={pos.cancelReason}
                        onChange={(e) => pos.setCancelReason(e.target.value)}
                        sx={{ ...fieldSx, mt: 1 }}
                        multiline
                        minRows={2}
                      />
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={pos.cancelling}
                        onClick={() => void pos.cancelSale()}
                        style={{ marginTop: 10 }}
                      >
                        {pos.cancelling ? "Cancelando…" : "Cancelar venta"}
                      </button>
                    </>
                  ) : (
                    <p className={styles.detailWarn}>
                      {pos.cancelGate.reason ||
                        "No tienes permiso para cancelar esta venta."}
                    </p>
                  )}
                </div>
              ) : (
                <div className={styles.detailCancelBox}>
                  <h4>Venta cancelada</h4>
                  <p className={styles.detailWarn}>
                    Motivo: {pos.detailSale.cancelReason || "—"}
                  </p>
                </div>
              )}
            </div>
          </div>,
              document.body,
            )
          : null}

        {pos.ticketOpen && pos.lastSale && typeof document !== "undefined"
          ? createPortal(
              <div
                className={`${styles.drawer} ${styles.posDrawerPortal}`}
                role="dialog"
                aria-modal="true"
                onClick={() => pos.setTicketOpen(false)}
              >
                <div
                  className={styles.drawerPanel}
                  style={{
                    height: "auto",
                    maxHeight: "90vh",
                    placeSelf: "center",
                    borderRadius: 16,
                    width: "min(420px, 94vw)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ marginTop: 0 }}>
                    Venta {formatPosFolio(pos.lastSale.folio)}
                  </h3>
                  <p style={{ fontSize: 14 }}>
                    Total {money(pos.lastSale.total)} ·{" "}
                    {statusLabel(pos.lastSale.status)}
                    {pos.lastSale.quoteNumber
                      ? ` · No. Cotización: ${pos.lastSale.quoteNumber}`
                      : ""}
                  </p>
                  <div className={styles.drawerActions}>
                    <button
                      type="button"
                      className={styles.chargeBtn}
                      style={{ marginTop: 0 }}
                      onClick={() =>
                        pos.openTicket(pos.lastSale!.idPosSale, {
                          folio: pos.lastSale!.folio,
                          createdAt: pos.lastSale!.createdAt,
                        })
                      }
                    >
                      <Printer
                        size={14}
                        style={{ display: "inline", marginRight: 6 }}
                      />
                      Imprimir ticket
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.setTicketOpen(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}

        {pos.cashSessionDetail || pos.cashSessionDetailLoading ? (
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            onClick={() => pos.setCashSessionDetail(null)}
          >
            <div
              className={`${styles.drawerPanel} ${styles.cashSessionModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              {pos.cashSessionDetailLoading || !pos.cashSessionDetail ? (
                <div
                  style={{ display: "grid", placeItems: "center", padding: 32 }}
                >
                  <CircularProgress sx={{ color: "#bb3d4b" }} />
                </div>
              ) : (
                <>
                  <div className={styles.cashSessionModalHead}>
                    <div>
                      <p className={styles.detailEyebrow}>Caja</p>
                      <h3 className={styles.cashSessionModalTitle}>
                        Sesión #{pos.cashSessionDetail.idCashSession}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.setCashSessionDetail(null)}
                      aria-label="Cerrar"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={styles.cashSessionModalBody}>
                    <div className={styles.totalsBox}>
                      <div className={styles.totalsRow}>
                        <span>Estado</span>
                        <strong>
                          {pos.cashSessionDetail.status === "open"
                            ? "Abierta"
                            : "Cerrada"}
                        </strong>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Abierta por</span>
                        <span>{pos.cashSessionDetail.openedByName || "—"}</span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Desde</span>
                        <span>
                          {new Date(
                            pos.cashSessionDetail.openedAt,
                          ).toLocaleString("es-MX")}
                        </span>
                      </div>
                      {pos.cashSessionDetail.closedAt ? (
                        <div className={styles.totalsRow}>
                          <span>Cierre</span>
                          <span>
                            {new Date(
                              pos.cashSessionDetail.closedAt,
                            ).toLocaleString("es-MX")}
                            {pos.cashSessionDetail.closedByName
                              ? ` · ${pos.cashSessionDetail.closedByName}`
                              : ""}
                          </span>
                        </div>
                      ) : null}
                      <div className={styles.totalsRow}>
                        <span>Fondo inicial</span>
                        <span>
                          {money(pos.cashSessionDetail.openingFloat)}
                        </span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Esperado</span>
                        <span>
                          {pos.cashSessionDetail.expectedCash != null
                            ? money(pos.cashSessionDetail.expectedCash)
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span>Contado</span>
                        <span>
                          {pos.cashSessionDetail.closingCounted != null
                            ? money(pos.cashSessionDetail.closingCounted)
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.totalsGrand}>
                        <span>Diferencia</span>
                        <span>
                          {pos.cashSessionDetail.difference != null
                            ? money(pos.cashSessionDetail.difference)
                            : "—"}
                        </span>
                      </div>
                      {pos.cashSessionDetail.differenceReason ? (
                        <div className={styles.totalsRow}>
                          <span>Motivo del descuadre</span>
                          <span>{pos.cashSessionDetail.differenceReason}</span>
                        </div>
                      ) : null}
                      {pos.cashSessionDetail.notes ? (
                        <div className={styles.totalsRow}>
                          <span>Notas</span>
                          <span style={{ whiteSpace: "pre-wrap" }}>
                            {pos.cashSessionDetail.notes}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.cashSessionMovesHead}>
                      <h4>Movimientos</h4>
                      {(pos.cashSessionDetail.movementsTotal ??
                        pos.cashSessionDetail.movements?.length ??
                        0) > 0 ? (
                        <span className={styles.cashSessionMovesCount}>
                          {pos.cashSessionDetail.movementsTotal ??
                            pos.cashSessionDetail.movements?.length}{" "}
                          en total
                        </span>
                      ) : null}
                    </div>

                    {(pos.cashSessionDetail.movements?.length || 0) === 0 ? (
                      <p className={styles.cashSessionEmptyMoves}>
                        Sin movimientos registrados.
                      </p>
                    ) : (
                      <div className={styles.scrollPanelSm}>
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th>Hora</th>
                              <th>Tipo</th>
                              <th>Monto</th>
                              <th>Motivo</th>
                              <th>Usuario</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pos.cashSessionDetail.movements!.map((m) => (
                              <tr key={m.idCashMovement}>
                                <td>
                                  {new Date(m.createdAt).toLocaleString(
                                    "es-MX",
                                  )}
                                </td>
                                <td>
                                  {POS_CASH_MOVEMENT_LABELS[
                                    m.type as PosCashMovementType
                                  ] || m.type}
                                </td>
                                <td>{money(m.amount)}</td>
                                <td>{m.reason || "—"}</td>
                                <td>{m.userName || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {(pos.cashSessionDetail.movementsTotal ?? 0) >
                    (pos.cashSessionDetail.movements?.length || 0) ? (
                      <a
                        className={styles.cashSessionViewAll}
                        href={`/punto-de-venta/caja/sesion/${pos.cashSessionDetail.idCashSession}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={15} strokeWidth={2.25} />
                        Ver todos los movimientos
                      </a>
                    ) : null}
                  </div>

                  <div className={styles.cashSessionModalFooter}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => pos.setCashSessionDetail(null)}
                    >
                      Cerrar
                    </button>
                    {(pos.cashSessionDetail.movementsTotal ?? 0) > 0 ? (
                      <a
                        className={styles.primaryOutlineBtn}
                        href={`/punto-de-venta/caja/sesion/${pos.cashSessionDetail.idCashSession}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={14} strokeWidth={2.25} />
                        Abrir en pantalla completa
                      </a>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
