"use client";

import { Alert, CircularProgress, InputAdornment, TextField } from "@mui/material";
import { FileText, Search, Trash2, Warehouse, Wrench, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import { adminFieldSx } from "../theme/adminFieldSx";
import styles from "./generar.module.css";
import QuotePdfPreview from "./QuotePdfPreview";
import useGenerarCotizacion, {
  QUOTE_LADA_OPTIONS,
} from "./useGenerarCotizacion";
import { QuoteDetailLevel } from "./pdf/CotizacionPdf";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const FALLBACK_PRODUCT_IMAGE = "/imagen-no-encontrada.png";

function resolveProductImage(imageUrl: unknown): string {
  if (!imageUrl) return FALLBACK_PRODUCT_IMAGE;
  if (typeof imageUrl === "string") {
    const value = imageUrl.trim();
    if (!value) return FALLBACK_PRODUCT_IMAGE;
    if (value.startsWith("[") || value.startsWith("{")) {
      try {
        return resolveProductImage(JSON.parse(value));
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(imageUrl)) {
    const first = imageUrl.find((item) => typeof item === "string" && item.trim());
    return first ? String(first) : FALLBACK_PRODUCT_IMAGE;
  }
  if (typeof imageUrl === "object") {
    const first = Object.values(imageUrl as Record<string, unknown>).find(
      (item) => typeof item === "string" && item.trim(),
    );
    return first ? String(first) : FALLBACK_PRODUCT_IMAGE;
  }
  return FALLBACK_PRODUCT_IMAGE;
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
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
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

      {!quote.cartReady ? (
        <div className={styles.empty}>Cargando carrito...</div>
      ) : quote.cartTotalCount === 0 ? (
        <div className={styles.empty}>Agrega al menos un producto.</div>
      ) : (
        <div className={styles.cartBlock}>
          {cartPager}
          <ul className={styles.cartList}>
          {quote.lines.map((line) => {
            const unit = Number(line.price) || 0;
            const quantity = line.quantity === "" ? 0 : line.quantity;
            return (
              <li
                key={line.idProduct}
                className={styles.cartCard}
                data-testid={`quote-line-${line.idProduct}`}
              >
                <span className={styles.cartThumb}>
                  <img
                    src={resolveProductImage(line.image_url)}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </span>
                <div className={styles.cartBody}>
                  <strong title={line.name}>{line.name}</strong>
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
          </ul>
          {cartPager}
        </div>
      )}

      <div className={styles.footer}>
        <div>
          <div className={styles.total}>
            Total {currencyFormatter.format(quote.total)}
          </div>
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
      />
      </div>
    </div>
  );
}
