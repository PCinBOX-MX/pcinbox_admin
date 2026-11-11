"use client";

import { Alert, CircularProgress, InputAdornment, TextField } from "@mui/material";
import { FileText, GripVertical, ImagePlus, Landmark, MessageSquare, Search, Trash2, Warehouse, Wrench, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import { adminFieldSx } from "../theme/adminFieldSx";
import styles from "./generar.module.css";
import QuotePdfPreview from "./QuotePdfPreview";
import { QuoteLiveCost } from "./QuoteCostPanel";
import PosNumberField from "../punto-de-venta/PosNumberField";
import PosDeliveryAddress from "../punto-de-venta/PosDeliveryAddress";
import useGenerarCotizacion, {
  QUOTE_LADA_OPTIONS,
} from "./useGenerarCotizacion";
import { QuoteDetailLevel } from "./pdf/CotizacionPdf";
import { MANUAL_PRODUCT_IMAGE } from "./pdf/manualProductImage";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const FALLBACK_PRODUCT_IMAGE = "/imagen-no-encontrada.png";

function readManualImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    return Promise.reject(new Error("Usa una imagen JPG, PNG o WEBP."));
  }
  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new Error("La imagen debe pesar menos de 8 MB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const max = 440;
        const longest = Math.max(source.width, source.height) || 1;
        const scale = Math.min(1, max / longest);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo preparar la imagen."));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        if (dataUrl.length > 700_000) {
          reject(new Error("La imagen sigue siendo muy pesada. Prueba con otra."));
          return;
        }
        resolve(dataUrl);
      };
      source.onerror = () => reject(new Error("La imagen no es válida."));
      source.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function resolveProductImage(imageUrl: unknown, manual = false): string {
  if (!imageUrl) return manual ? MANUAL_PRODUCT_IMAGE : FALLBACK_PRODUCT_IMAGE;
  if (typeof imageUrl === "string") {
    const value = imageUrl.trim();
    if (!value || value.includes("producto-sin-foto")) {
      return manual ? MANUAL_PRODUCT_IMAGE : FALLBACK_PRODUCT_IMAGE;
    }
    if (value.startsWith("[") || value.startsWith("{")) {
      try {
        return resolveProductImage(JSON.parse(value), manual);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(imageUrl)) {
    const first = imageUrl.find((item) => typeof item === "string" && item.trim());
    return first ? String(first) : manual ? MANUAL_PRODUCT_IMAGE : FALLBACK_PRODUCT_IMAGE;
  }
  if (typeof imageUrl === "object") {
    const first = Object.values(imageUrl as Record<string, unknown>).find(
      (item) => typeof item === "string" && item.trim(),
    );
    return first ? String(first) : manual ? MANUAL_PRODUCT_IMAGE : FALLBACK_PRODUCT_IMAGE;
  }
  return manual ? MANUAL_PRODUCT_IMAGE : FALLBACK_PRODUCT_IMAGE;
}

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function GenerarCotizacionPanel({ onClose, onCreated }: Props) {
  const quote = useGenerarCotizacion(onCreated);
  const busy = quote.generating !== null;
  const canGenerate = quote.cartTotalCount > 0 && quote.cartReady && !busy;
  const cartPager =
    quote.cartTotalCount > 4 ? (
      <div className={styles.cartPager}>
        <ModernPagination
          page={quote.cartPage}
          pageCount={quote.cartTotalPages}
          totalItems={quote.cartTotalCount}
          pageSize={4}
          onPageChange={quote.goToCartPage}
          label="productos"
          scrollOnChange={false}
        />
      </div>
    ) : null;

  const alertRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [previewLevel, setPreviewLevel] = useState<QuoteDetailLevel>("full");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | "previous" | "next" | null>(
    null,
  );
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [equipmentDraft, setEquipmentDraft] = useState("1");
  const equipmentFocused = useRef(false);

  useEffect(() => {
    if (!equipmentFocused.current) {
      setEquipmentDraft(String(quote.equipmentCount));
    }
  }, [quote.equipmentCount]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUpc, setManualUpc] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [manualImageError, setManualImageError] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const manualFileRef = useRef<HTMLInputElement>(null);
  const [suggestionBox, setSuggestionBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const importFailed = /cotizaci/i.test(quote.error);

  useEffect(() => {
    if (!quote.error) return;
    alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [quote.error]);

  useEffect(() => {
    setSuggestionsHidden(false);
  }, [quote.query]);

  const suggestionsOpen =
    quote.query.trim().length >= 2 && !suggestionsHidden;

  useEffect(() => {
    if (!suggestionsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (searchRef.current?.contains(target)) return;
      if (resultsRef.current?.contains(target)) return;
      setSuggestionsHidden(true);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [suggestionsOpen]);

  useLayoutEffect(() => {
    if (!suggestionsOpen) {
      setSuggestionBox(null);
      return;
    }
    const placeSuggestions = () => {
      const node = searchRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const available = window.innerHeight - rect.bottom - 16;
      const maxHeight = Math.min(420, Math.max(available, 120));
      setSuggestionBox({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };
    placeSuggestions();
    window.addEventListener("resize", placeSuggestions);
    window.addEventListener("scroll", placeSuggestions, true);
    return () => {
      window.removeEventListener("resize", placeSuggestions);
      window.removeEventListener("scroll", placeSuggestions, true);
    };
  }, [suggestionsOpen]);

  const costRevision = [
    quote.cartTotalCount,
    quote.total,
    quote.lines
      .map((line) => `${line.idProduct}:${line.quantity}:${line.price}`)
      .join(","),
  ].join("|");

  return (
    <div className={styles.panel} data-testid="generar-cotizacion-panel">
      <div className={styles.lead}>
        <div>
          <h2>Nueva cotización</h2>
          <p>
            Arma el carrito y, cuando quieras, genera la vista previa. El
            archivo se guarda hasta que eliges un botón.
          </p>
        </div>
        <button
          type="button"
          className={styles.closeForm}
          onClick={onClose}
          disabled={busy}
        >
          <X size={16} />
          Cerrar formulario
        </button>
      </div>

      <div className={styles.quoteWorkspace}>
      <div className={styles.quoteForm}>
      {quote.error ? (
        <div ref={alertRef} className={styles.formAlert} role="alert">
          <Alert severity="error" onClose={quote.dismissError}>
            {quote.error}
          </Alert>
        </div>
      ) : null}

      <div className={styles.clientCard}>
      <div className={styles.grid}>
        <TextField
          size="small"
          fullWidth
          label="Nombre del cliente"
          value={quote.customerName}
          onChange={(event) => quote.setCustomerName(event.target.value)}
          sx={adminFieldSx}
          slotProps={{
            input: {
              endAdornment: quote.customerName ? (
                <button
                  type="button"
                  className={styles.clearSearch}
                  aria-label="Borrar nombre del cliente"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => quote.setCustomerName("")}
                  data-testid="quote-customer-name-clear"
                >
                  <X size={16} />
                </button>
              ) : null,
            },
          }}
          inputProps={{ "data-testid": "quote-customer-name", maxLength: 120 }}
        />
        <TextField
          size="small"
          fullWidth
          label="Teléfono"
          placeholder="10 dígitos"
          value={quote.customerPhone}
          disabled={busy}
          error={Boolean(quote.phoneError)}
          helperText={quote.phoneError || undefined}
          onChange={(event) => {
            const value = event.target.value;
            if (/^\d*$/.test(value) && value.length <= 10) {
              quote.setCustomerPhone(value);
            }
          }}
          sx={adminFieldSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <select
                    aria-label="Lada"
                    className={styles.ladaSelect}
                    value={quote.customerLada}
                    disabled={busy}
                    data-testid="quote-customer-lada"
                    onChange={(event) =>
                      quote.setCustomerLada(event.target.value)
                    }
                  >
                    {QUOTE_LADA_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </InputAdornment>
              ),
              endAdornment: quote.customerPhone ? (
                <button
                  type="button"
                  className={styles.clearSearch}
                  aria-label="Borrar teléfono"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => quote.setCustomerPhone("")}
                  data-testid="quote-customer-phone-clear"
                >
                  <X size={16} />
                </button>
              ) : null,
            },
          }}
          inputProps={{
            "data-testid": "quote-customer-phone",
            inputMode: "numeric",
            maxLength: 10,
          }}
        />
      </div>

      <div className={styles.optionRow}>
      <label className={styles.assembly}>
        <span className={styles.assemblyIcon} aria-hidden="true">
          <Wrench size={16} strokeWidth={2.25} />
        </span>
        <span className={styles.assemblyText}>Incluir servicio de ensamble</span>
        <span className={styles.assemblyControl}>
          <input
            type="checkbox"
            checked={quote.includeAssembly}
            onChange={(event) => quote.setIncludeAssembly(event.target.checked)}
            data-testid="quote-assembly"
          />
          <span className={styles.assemblyMark} aria-hidden="true" />
        </span>
      </label>
      <label className={styles.assembly}>
        <span className={styles.assemblyIcon} aria-hidden="true">
          <Landmark size={16} strokeWidth={2.25} />
        </span>
        <span className={styles.assemblyText}>Incluir datos de transferencia</span>
        <span className={styles.assemblyControl}>
          <input
            type="checkbox"
            checked={quote.includeTransfer}
            onChange={(event) => quote.setIncludeTransfer(event.target.checked)}
            data-testid="quote-transfer"
          />
          <span className={styles.assemblyMark} aria-hidden="true" />
        </span>
      </label>
      <label className={styles.assembly}>
        <span className={styles.assemblyIcon} aria-hidden="true">
          <MessageSquare size={16} strokeWidth={2.25} />
        </span>
        <span className={styles.assemblyText}>Comentarios adicionales</span>
        <span className={styles.assemblyControl}>
          <input
            type="checkbox"
            checked={quote.showComments === true}
            onChange={(event) => quote.setShowComments(event.target.checked)}
            data-testid="quote-comments-toggle"
          />
          <span className={styles.assemblyMark} aria-hidden="true" />
        </span>
      </label>
      <label className={styles.equipmentChip}>
        <span>Cantidad de equipos</span>
        <input
          value={equipmentDraft}
          disabled={busy}
          inputMode="numeric"
          aria-label="Cantidad de equipos"
          title="Si son varios equipos iguales, el PDF multiplica el total."
          data-testid="quote-equipment-count"
          onFocus={() => {
            equipmentFocused.current = true;
          }}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
            setEquipmentDraft(digits);
            if (digits !== "") quote.setEquipmentCount(Number(digits));
          }}
          onBlur={() => {
            equipmentFocused.current = false;
            const parsed = Number(equipmentDraft);
            const next =
              equipmentDraft === "" || !Number.isInteger(parsed) || parsed < 1
                ? 1
                : Math.min(999, parsed);
            setEquipmentDraft(String(next));
            quote.setEquipmentCount(next);
          }}
        />
      </label>
      </div>

      {quote.includeAssembly ? (
        <div className={styles.assemblyPrice}>
          <PosNumberField
            label="Precio del ensamble"
            value={quote.assemblyPrice}
            moneyInWords
            sx={adminFieldSx}
            onCommit={quote.setAssemblyPrice}
          />
          <p className={styles.manualHint}>
            Opcional. Si lo dejas vacío, el PDF solo indica que el ensamble va incluido.
          </p>
        </div>
      ) : null}

      {quote.showComments ? (
      <TextField
        className={styles.quoteComments}
        size="small"
        fullWidth
        multiline
        minRows={3}
        maxRows={8}
        label="Comentarios adicionales"
        placeholder="Notas para el cliente (opcional)"
        value={quote.comments ?? ""}
        disabled={busy}
        onChange={(event) => quote.setComments(event.target.value)}
        sx={adminFieldSx}
        inputProps={{
          "data-testid": "quote-comments",
          maxLength: 500,
        }}
      />
      ) : null}

      <div className={styles.deliverySlot}>
        <PosDeliveryAddress
          enabled={quote.homeDelivery === true}
          onEnabledChange={quote.setHomeDelivery}
          addresses={quote.deliveryAddresses}
          editor={quote.deliveryEditor}
          errors={quote.deliveryErrors}
          onStartAdd={quote.startAddDelivery}
          onStartEdit={quote.startEditDelivery}
          onRemove={quote.removeDeliveryAddress}
          onChangeEditor={quote.changeDeliveryEditor}
          onRegister={quote.registerDelivery}
          onCancelEditor={quote.cancelDeliveryEditor}
          idleHint="Actívalo si la cotización incluye envío a domicilio."
          activeHint="Cada domicilio tiene su costo y se suma una vez al total."
        />
      </div>

      </div>

      <div className={styles.tools}>
      <div className={styles.importBox}>
        <p className={styles.importTitle}>Importar cotización</p>
        <div className={styles.importRow}>
          <TextField
            size="small"
            fullWidth
            label="Número de cotización"
            placeholder="COT-... o 13 dígitos"
            value={quote.importNumber}
            disabled={busy || quote.importing || quote.unlinking}
            error={importFailed}
            onChange={(event) => quote.setImportNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void quote.importQuote();
              }
            }}
            sx={adminFieldSx}
            slotProps={{
              input: {
                endAdornment: quote.importNumber ? (
                  <button
                    type="button"
                    className={styles.clearSearch}
                    aria-label="Borrar número de cotización"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => quote.setImportNumber("")}
                    data-testid="quote-import-clear"
                  >
                    <X size={16} />
                  </button>
                ) : null,
              },
            }}
            inputProps={{ "data-testid": "quote-import-number", maxLength: 60 }}
          />
          <button
            type="button"
            className={`admin-btn-primary ${styles.importButton}`}
            disabled={busy || quote.importing || quote.unlinking || !quote.importNumber.trim()}
            onClick={() => void quote.importQuote()}
            data-testid="quote-import"
          >
            {quote.importing ? (
              <CircularProgress size={16} color="inherit" />
            ) : null}
            Importar
          </button>
        </div>
      </div>
      <div className={styles.searchBox} ref={searchRef}>
        <p className={styles.searchTitle}>Buscar producto</p>
        <TextField
          size="small"
          fullWidth
          label="Buscar producto por nombre, SKU o UPC"
          value={quote.query}
          onChange={(event) => quote.setQuery(event.target.value)}
          onFocus={() => setSuggestionsHidden(false)}
          sx={adminFieldSx}
          slotProps={{
            input: {
              startAdornment: <Search size={18} className="admin-filter-icon" />,
              endAdornment: (
                <>
                  {quote.query ? (
                    <button
                      type="button"
                      className={styles.clearSearch}
                      aria-label="Borrar búsqueda"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => quote.setQuery("")}
                      data-testid="quote-search-clear"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                  {quote.searching ? <CircularProgress size={16} /> : null}
                </>
              ),
            },
          }}
          inputProps={{ "data-testid": "quote-product-search" }}
        />
        {suggestionsOpen &&
        suggestionBox &&
        !quote.searching &&
        !quote.error &&
        quote.results.length === 0
          ? createPortal(
              <div
                ref={resultsRef}
                className={styles.results}
                style={{
                  top: suggestionBox.top,
                  left: suggestionBox.left,
                  width: suggestionBox.width,
                }}
                data-testid="quote-search-empty"
              >
                <p className={styles.emptyResults}>Sin coincidencias disponibles.</p>
              </div>,
              document.body,
            )
          : null}
        {quote.results.length > 0 && suggestionsOpen && suggestionBox
          ? createPortal(
          <div
            ref={resultsRef}
            className={styles.results}
            style={{
              top: suggestionBox.top,
              left: suggestionBox.left,
              width: suggestionBox.width,
              maxHeight: suggestionBox.maxHeight,
            }}
            data-testid="quote-search-results"
          >
            {quote.results.map((product) => (
              <button
                key={product.idProduct}
                type="button"
                className={styles.result}
                onClick={() => quote.addProduct(product)}
                data-testid={`quote-add-${product.idProduct}`}
              >
                <span className={styles.thumb}>
                  <img
                    src={resolveProductImage(product.image_url)}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </span>
                <div className={styles.resultBody}>
                  <div className={styles.resultHead}>
                    <strong>{product.name}</strong>
                    <span className={styles.resultBadges}>
                      <span
                        className={
                          product.active === false ? styles.badgeOff : styles.badgeOn
                        }
                      >
                        {product.active === false ? "Inactivo" : "Activo"}
                      </span>
                      {product.kind ? (
                        <span className={styles.badgePc}>{product.kind}</span>
                      ) : null}
                    </span>
                  </div>
                  <dl className={styles.resultCodes}>
                    <div>
                      <dt>SKU</dt>
                      <dd>{product.sku || "Sin SKU"}</dd>
                    </div>
                    <div>
                      <dt>UPC</dt>
                      <dd>{product.upc || "Sin UPC"}</dd>
                    </div>
                  </dl>
                  <div className={styles.stockBlock}>
                    <div className={styles.stockTotalLine}>
                      <span>Stock total</span>
                      <strong>{Number(product.stock) || 0} pzas</strong>
                    </div>
                    {(product.stocksByBranch ?? []).length > 0 ? (
                      <ul className={styles.branchList}>
                        {(product.stocksByBranch ?? []).map((branch) => (
                          <li key={branch.branchId}>
                            <span>{branch.label}</span>
                            <strong>{branch.stock} pzas</strong>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <div className={styles.resultPrice}>
                  <span>Precio</span>
                  <strong>
                    {currencyFormatter.format(Number(product.price) || 0)}
                  </strong>
                </div>
              </button>
            ))}
          </div>,
          document.body,
        ) : null}
      </div>
      </div>

      <div className={styles.manualBox}>
        <button
          type="button"
          className={styles.manualToggle}
          aria-expanded={manualOpen}
          onClick={() => setManualOpen((open) => !open)}
          data-testid="quote-manual-toggle"
        >
          <ImagePlus size={18} />
          {manualOpen ? "Cerrar producto sin catálogo" : "Agregar producto sin catálogo"}
        </button>
        {manualOpen ? (
          <form
            className={styles.manualCard}
            onSubmit={(event) => {
              event.preventDefault();
              if (manualSaving || busy) return;
              const price = Number(String(manualPrice).replace(/,/g, ""));
              const quantity = Number(manualQty);
              setManualSaving(true);
              void quote
                .addManualProduct({
                  name: manualName,
                  price,
                  quantity,
                  upc: manualUpc,
                  notes: manualNotes,
                  image: manualImage,
                })
                .then((added) => {
                  if (!added) return;
                  setManualName("");
                  setManualPrice("");
                  setManualQty("1");
                  setManualUpc("");
                  setManualNotes("");
                  setManualImage("");
                  setManualImageError("");
                  if (manualFileRef.current) manualFileRef.current.value = "";
                  setManualOpen(false);
                })
                .finally(() => setManualSaving(false));
            }}
          >
            <div className={styles.manualHead}>
              <div>
                <strong>Nuevo producto</strong>
                <p>Se imprime en el PDF igual que uno del catálogo.</p>
              </div>
            </div>
            <div className={styles.manualBody}>
              <div className={styles.manualPhoto}>
                <input
                  ref={manualFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  data-testid="quote-manual-image"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setManualImageError("");
                    void readManualImage(file)
                      .then((dataUrl) => {
                        setManualImage(dataUrl);
                        setManualImageError("");
                      })
                      .catch((error: unknown) => {
                        setManualImageError(
                          error instanceof Error
                            ? error.message
                            : "No se pudo usar esa imagen.",
                        );
                      });
                  }}
                />
                <button
                  type="button"
                  className={styles.manualPhotoButton}
                  disabled={busy || manualSaving}
                  onClick={() => manualFileRef.current?.click()}
                >
                  <img
                    src={manualImage || MANUAL_PRODUCT_IMAGE}
                    alt={manualImage ? "Imagen del producto" : "Sin imagen"}
                  />
                  <span>{manualImage ? "Cambiar imagen" : "Subir imagen"}</span>
                </button>
                {manualImage ? (
                  <button
                    type="button"
                    className={styles.manualPhotoClear}
                    disabled={busy || manualSaving}
                    onClick={() => {
                      setManualImage("");
                      setManualImageError("");
                    }}
                  >
                    Quitar imagen
                  </button>
                ) : (
                  <p className={styles.manualHint}>JPG, PNG o WEBP. Si no subes foto, se usa esta.</p>
                )}
                {manualImageError ? (
                  <p className={styles.manualImageError}>{manualImageError}</p>
                ) : null}
              </div>
              <div className={styles.manualFields}>
                <TextField
                  size="small"
                  fullWidth
                  label="Nombre del producto"
                  placeholder="Como debe aparecer en la cotización"
                  value={manualName}
                  disabled={busy || manualSaving}
                  onChange={(event) => setManualName(event.target.value.slice(0, 180))}
                  sx={adminFieldSx}
                  inputProps={{ "data-testid": "quote-manual-name", maxLength: 180 }}
                />
                <div className={styles.manualGrid}>
                  <PosNumberField
                    label="Precio"
                    value={manualPrice}
                    moneyInWords
                    sx={adminFieldSx}
                    onCommit={(raw) => {
                      const amount = Number(raw);
                      if (raw !== "" && (!Number.isFinite(amount) || amount > 999999.99)) return;
                      setManualPrice(raw);
                    }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Cantidad"
                    placeholder="1"
                    type="number"
                    value={manualQty}
                    disabled={busy || manualSaving}
                    onChange={(event) =>
                      setManualQty(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    sx={adminFieldSx}
                    inputProps={{
                      min: 1,
                      max: 999,
                      "data-testid": "quote-manual-qty",
                    }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="UPC (opcional)"
                    placeholder="Código de barras"
                    value={manualUpc}
                    disabled={busy || manualSaving}
                    onChange={(event) =>
                      setManualUpc(event.target.value.replace(/[^\dA-Za-z]/g, "").slice(0, 32))
                    }
                    sx={adminFieldSx}
                    inputProps={{ "data-testid": "quote-manual-upc", maxLength: 32 }}
                  />
                </div>
                <TextField
                  className={styles.manualNotes}
                  size="small"
                  fullWidth
                  label="Características"
                  placeholder="Se imprimen debajo del nombre"
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={manualNotes}
                  disabled={busy || manualSaving}
                  onChange={(event) => setManualNotes(event.target.value.slice(0, 500))}
                  sx={adminFieldSx}
                  inputProps={{
                    "data-testid": "quote-manual-notes",
                    maxLength: 500,
                  }}
                />
              </div>
            </div>
            <div className={styles.manualActions}>
              <button
                type="submit"
                className={`admin-btn-primary ${styles.manualSubmit}`}
                disabled={
                  busy ||
                  manualSaving ||
                  manualName.trim().length < 2 ||
                  manualPrice === "" ||
                  Number(manualQty) < 1
                }
                data-testid="quote-manual-add"
              >
                {manualSaving ? <CircularProgress size={16} color="inherit" /> : null}
                Agregar al carrito
              </button>
            </div>
          </form>
        ) : null}
      </div>
      {quote.notice ? (
        <Alert severity="success" onClose={quote.dismissNotice}>
          {quote.notice}
        </Alert>
      ) : null}
      {quote.importedQuotes.length > 0 ? (
        <div className={styles.importBanner} role="status">
          <div className={styles.importBannerHead}>
            <span className={styles.importBannerIcon} aria-hidden="true">
              <FileText size={16} />
            </span>
            <div>
              <strong>
                {quote.importedQuotes.length === 1
                  ? "Cotización importada"
                  : `${quote.importedQuotes.length} cotizaciones importadas`}
              </strong>
              <p>Sus productos están en este carrito.</p>
            </div>
          </div>
          <ul className={styles.importLinks}>
            {quote.importedQuotes.map((folio) => (
              <li key={folio}>
                <span>{folio}</span>
                <button
                  type="button"
                  className={styles.importLink}
                  disabled={busy || quote.importing || quote.unlinking}
                  onClick={() => quote.confirmUnlinkQuote(folio)}
                >
                  Desvincular
                </button>
              </li>
            ))}
          </ul>
          {quote.importedQuotes.length > 1 ? (
            <button
              type="button"
              className={styles.importLinkAll}
              disabled={busy || quote.importing || quote.unlinking}
              onClick={quote.confirmUnlinkAll}
            >
              Desvincular todas
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.sectionHead}>
        <h3>Productos</h3>
        <span>
          {quote.cartReady
            ? quote.cartTotalCount === 1
              ? "1 en el carrito"
              : `${quote.cartTotalCount} en el carrito`
            : "Cargando"}
        </span>
      </div>
      {quote.cartReady && quote.cartTotalCount > 1 ? (
        <p className={styles.orderHint}>
          Arrastra los puntos para acomodar los productos. Si hay más páginas,
          suéltalo en la franja de la página anterior o siguiente. Ese orden es
          el del PDF.
        </p>
      ) : null}

      {!quote.cartReady ? (
        <div className={styles.empty}>Cargando carrito...</div>
      ) : quote.cartTotalCount === 0 ? (
        <div className={styles.empty}>Agrega al menos un producto.</div>
      ) : (
        <div className={styles.cartBlock}>
          {cartPager}
          <ul className={styles.cartList}>
          {draggingId != null && quote.cartPage > 1 ? (
            <li
              className={
                dragOverId === "previous"
                  ? `${styles.pageDrop} ${styles.pageDropOver}`
                  : styles.pageDrop
              }
              onDragOver={(event) => {
                if (busy) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragOverId !== "previous") setDragOverId("previous");
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isInteger(from) && from > 0) {
                  quote.moveLineToNeighborPage(from, "previous");
                }
                setDraggingId(null);
                setDragOverId(null);
              }}
            >
              Soltar para mover a la página anterior
            </li>
          ) : null}
          {quote.lines.map((line) => {
            const unit = Number(line.price) || 0;
            const quantity = line.quantity === "" ? 0 : line.quantity;
            return (
              <li
                key={line.idProduct}
                className={[
                  styles.cartCard,
                  draggingId === line.idProduct ? styles.cartCardDragging : "",
                  dragOverId === line.idProduct && draggingId !== line.idProduct
                    ? styles.cartCardOver
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-testid={`quote-line-${line.idProduct}`}
                onDragOver={(event) => {
                  if (busy) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverId !== line.idProduct) setDragOverId(line.idProduct);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(from) && from > 0) {
                    quote.reorderLine(from, line.idProduct);
                  }
                  setDraggingId(null);
                  setDragOverId(null);
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  draggable={!busy}
                  className={styles.dragHandle}
                  aria-label={`Mover ${line.name}`}
                  title="Arrastra para cambiar el orden"
                  data-testid={`quote-drag-${line.idProduct}`}
                  onDragStart={(event) => {
                    if (busy) {
                      event.preventDefault();
                      return;
                    }
                    const card = event.currentTarget.closest("li");
                    if (card instanceof HTMLElement) {
                      event.dataTransfer.setDragImage(card, 28, 28);
                    }
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(line.idProduct));
                    setDraggingId(line.idProduct);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                >
                  <GripVertical size={18} />
                </div>
                <span className={styles.cartThumb}>
                  <img
                    src={resolveProductImage(line.image_url, line.manual === true)}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = line.manual
                        ? MANUAL_PRODUCT_IMAGE
                        : FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </span>
                <div className={styles.cartBody}>
                  <strong title={line.name}>{line.name}</strong>
                  {line.manual ? (
                    <>
                      <span className={styles.manualBadge}>Sin catálogo</span>
                      {line.upc ? (
                        <div className={styles.cartCodes}>
                          <span>{`UPC ${line.upc}`}</span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                  <div className={styles.cartCodes}>
                    <span>{line.sku ? `SKU ${line.sku}` : "Sin SKU"}</span>
                    {line.upc ? <span>{`UPC ${line.upc}`}</span> : null}
                  </div>
                  <div className={styles.cartStock}>
                    <div className={styles.cartStockCell}>
                      <strong>{Number(line.stock) || 0}</strong>
                      <span className={styles.cartStockName}>
                        <Warehouse size={13} />
                        Total
                      </span>
                    </div>
                    {(line.stocksByBranch ?? []).map((branch) => (
                      <div
                        key={branch.branchId}
                        className={
                          branch.stock > 0
                            ? `${styles.cartStockCell} ${styles.cartStockIn}`
                            : styles.cartStockCell
                        }
                      >
                        <strong>{branch.stock}</strong>
                        <span title={branch.label}>{branch.label}</span>
                      </div>
                    ))}
                  </div>
                    </>
                  )}
                </div>
                <div className={styles.cartMeta}>
                  <label className={styles.qtyBox}>
                    <span>Cant.</span>
                    <TextField
                      size="small"
                      type="number"
                      value={line.quantity}
                      className={styles.qty}
                      onChange={(event) => {
                        const raw = event.target.value;
                        quote.setQuantity(
                          line.idProduct,
                          raw.trim() === "" ? "" : Number(raw),
                        );
                      }}
                      sx={adminFieldSx}
                      inputProps={{
                        min: 1,
                        max: 999,
                        "aria-label": `Cantidad de ${line.name}`,
                        "data-testid": `quote-qty-${line.idProduct}`,
                      }}
                    />
                  </label>
                  <div className={styles.priceStack}>
                    <span>{currencyFormatter.format(unit)} c/u</span>
                    <strong>{currencyFormatter.format(unit * quantity)}</strong>
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Quitar ${line.name}`}
                    onClick={() => quote.removeLine(line.idProduct)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
          {draggingId != null && quote.cartPage < quote.cartTotalPages ? (
            <li
              className={
                dragOverId === "next"
                  ? `${styles.pageDrop} ${styles.pageDropOver}`
                  : styles.pageDrop
              }
              onDragOver={(event) => {
                if (busy) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragOverId !== "next") setDragOverId("next");
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                if (Number.isInteger(from) && from > 0) {
                  quote.moveLineToNeighborPage(from, "next");
                }
                setDraggingId(null);
                setDragOverId(null);
              }}
            >
              Soltar para mover a la página siguiente
            </li>
          ) : null}
          </ul>
          {cartPager}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.footerRow}>
        <div>
          {(() => {
            const equipos = Math.min(
              999,
              Math.max(1, Math.round(quote.equipmentCount) || 1),
            );
            const perPc = quote.total;
            const productsAll = perPc * equipos;
            const assemblyAll = quote.assemblyAmount * equipos;
            const shippingAll = quote.shippingAmount;
            const grand = productsAll + assemblyAll + shippingAll;
            return (
              <>
                {equipos > 1 || quote.shippingLines.length > 0 ? (
                  <div className={styles.totalBreakdown}>
                    {equipos > 1 ? (
                      <div className={styles.totalLine}>
                        <div className={styles.totalLineCopy}>
                          <span>Un equipo</span>
                          <small>Total por PC</small>
                        </div>
                        <strong>{currencyFormatter.format(perPc)}</strong>
                      </div>
                    ) : null}
                    {equipos > 1 ? (
                      <div className={styles.totalLine}>
                        <div className={styles.totalLineCopy}>
                          <span>{equipos} equipos</span>
                          <small>Total por PC × {equipos}</small>
                        </div>
                        <strong>{currencyFormatter.format(productsAll)}</strong>
                      </div>
                    ) : null}
                    {quote.assemblyAmount > 0 ? (
                      <div className={styles.totalLine}>
                        <div className={styles.totalLineCopy}>
                          <span>Ensamble</span>
                          <small>
                            {equipos > 1
                              ? `${currencyFormatter.format(quote.assemblyAmount)} × ${equipos}`
                              : "Un servicio"}
                          </small>
                        </div>
                        <strong>{currencyFormatter.format(assemblyAll)}</strong>
                      </div>
                    ) : null}
                    {quote.shippingLines.map((row, index) => (
                      <div className={styles.shipLine} key={`${row.label}-${index}`}>
                        <div className={styles.totalLineCopy}>
                          <span>Envío {index + 1}</span>
                          <div className={styles.shipPlaces}>
                            {row.postalCode ? <em>CP {row.postalCode}</em> : null}
                            {row.cologne ? <em>Col. {row.cologne}</em> : null}
                            {row.city || row.state ? (
                              <em>{[row.city, row.state].filter(Boolean).join(", ")}</em>
                            ) : null}
                          </div>
                        </div>
                        <strong>{currencyFormatter.format(row.shippingCost)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className={styles.total}>
                  Total{" "}
                  {currencyFormatter.format(grand)}
                </div>
              </>
            );
          })()}
          <p className={styles.hint}>
            La vista previa sale con su botón. El archivo se guarda con el
            botón que elijas.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.clearCart}
            disabled={quote.cartTotalCount === 0 || busy}
            onClick={quote.confirmClearCart}
            data-testid="quote-clear-cart"
          >
            <Trash2 size={16} />
            Vaciar carrito
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            disabled={!canGenerate}
            onClick={() => void quote.generate("full")}
            data-testid="quote-full-data"
          >
            {quote.generating === "full" ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <FileText size={16} />
            )}
            Datos completos
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={!canGenerate}
            onClick={() => void quote.generate("hidden")}
            data-testid="quote-hidden-data"
          >
            {quote.generating === "hidden" ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <FileText size={16} />
            )}
            Ocultar datos
          </button>
        </div>
        </div>
        <QuoteLiveCost
          loadLines={quote.loadPreviewLines}
          revision={costRevision}
          equipmentCount={quote.equipmentCount}
        />
      </div>
      </div>
      <QuotePdfPreview
        hasLines={quote.cartReady && quote.cartTotalCount > 0}
        detailLevel={previewLevel}
        onDetailLevel={setPreviewLevel}
        loadLines={quote.loadPreviewLines}
        userName={quote.customerName.trim().slice(0, 120)}
        userPhone={
          quote.customerPhone.replace(/\D/g, "").length === 10
            ? `${quote.customerLada} ${quote.customerPhone.replace(/\D/g, "")}`
            : ""
        }
        includeAssembly={quote.includeAssembly}
        assemblyPrice={quote.assemblyAmount}
        includeTransfer={quote.includeTransfer}
        comments={quote.showComments ? quote.comments.trim() : ""}
        equipmentCount={quote.equipmentCount}
        deliveries={quote.shippingLines}
      />
      </div>
    </div>
  );
}
