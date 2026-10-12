"use client";

import { Alert, CircularProgress, InputAdornment, TextField } from "@mui/material";
import { FileText, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import ModernPagination from "../shared/components/common/paginator/ModernPagination";
import { adminFieldSx } from "../theme/adminFieldSx";
import styles from "./generar.module.css";
import useGenerarCotizacion, {
  QUOTE_LADA_OPTIONS,
} from "./useGenerarCotizacion";

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
  const importFailed = /cotizaci/i.test(quote.error);

  useEffect(() => {
    if (!quote.error) return;
    alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [quote.error]);

  return (
    <div className={styles.panel} data-testid="generar-cotizacion-panel">
      <div className={styles.lead}>
        <p>
          Arma los productos y elige cómo saldrá el PDF. Datos completos
          incluye imagen, descripción, características y precios. Ocultar
          datos deja solo el nombre de cada producto y el total final.
        </p>
        <button
          type="button"
          className="admin-btn-ghost"
          onClick={onClose}
          disabled={busy}
        >
          <X size={16} />
          Cancelar
        </button>
      </div>

      {quote.error ? (
        <div ref={alertRef} className={styles.formAlert} role="alert">
          <Alert severity="error" onClose={quote.dismissError}>
            {quote.error}
          </Alert>
        </div>
      ) : null}

      <div className={styles.grid}>
        <TextField
          size="small"
          fullWidth
          label="Nombre del cliente"
          value={quote.customerName}
          onChange={(event) => quote.setCustomerName(event.target.value)}
          sx={adminFieldSx}
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
        <input
          type="checkbox"
          checked={quote.includeAssembly}
          onChange={(event) => quote.setIncludeAssembly(event.target.checked)}
          data-testid="quote-assembly"
        />
        Incluir servicio de ensamble
      </label>

      <div className={styles.importBox}>
        <p className={styles.importTitle}>Importar cotización</p>
        <div className={styles.importRow}>
          <TextField
            size="small"
            fullWidth
            label="Número de cotización"
            placeholder="COT-... o 13 dígitos"
            value={quote.importNumber}
            disabled={busy || quote.importing}
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
            disabled={busy || quote.importing || !quote.importNumber.trim()}
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
      {quote.notice ? (
        <Alert severity="success" onClose={quote.dismissNotice}>
          {quote.notice}
        </Alert>
      ) : null}

      <div className={styles.searchBox}>
        <p className={styles.searchTitle}>Buscar producto</p>
        <TextField
          size="small"
          fullWidth
          label="Buscar producto por nombre, SKU o UPC"
          value={quote.query}
          onChange={(event) => quote.setQuery(event.target.value)}
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
        {quote.results.length > 0 ? (
          <div className={styles.results} data-testid="quote-search-results">
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
                    <span
                      className={
                        product.active === false ? styles.badgeOff : styles.badgeOn
                      }
                    >
                      {product.active === false ? "Inactivo" : "Activo"}
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
          </div>
        ) : null}
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
                  <div className={styles.cartHead}>
                    <strong>{line.name}</strong>
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Quitar ${line.name}`}
                      onClick={() => quote.removeLine(line.idProduct)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className={styles.cartSku}>
                    {line.sku ? `SKU ${line.sku}` : "Sin SKU"}
                    {line.upc ? ` · UPC ${line.upc}` : ""}
                  </p>
                  <div className={styles.cartMeta}>
                    <label className={styles.cartField}>
                      <span>Cantidad</span>
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
                          "data-testid": `quote-qty-${line.idProduct}`,
                        }}
                      />
                    </label>
                    <div className={styles.cartField}>
                      <span>Precio</span>
                      <strong>{currencyFormatter.format(unit)}</strong>
                    </div>
                    <div className={`${styles.cartField} ${styles.cartImport}`}>
                      <span>Importe</span>
                      <strong>{currencyFormatter.format(unit * quantity)}</strong>
                    </div>
                  </div>
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
            El listado de arriba es para armar la cotización. El PDF cambia
            según el botón que uses.
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
  );
}
