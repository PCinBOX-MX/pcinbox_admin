import styles from "./generar.module.css";

export type QuoteStockBranch = {
  branchId: number;
  label: string;
  stock: number;
};

export type QuoteAvailability = {
  idProduct: number;
  active: boolean;
  stock: number;
  stocksByBranch: QuoteStockBranch[];
};

export type QuoteStockIncident = {
  idProduct: number;
  name: string;
  sku: string | null;
  quantity: number;
  reasons: string[];
  stocksByBranch: QuoteStockBranch[];
};

type LineRef = {
  idProduct: number;
  name: string;
  sku?: string | null;
  quantity: number;
};

export function buildQuoteStockIncidents(
  lines: LineRef[],
  availability: QuoteAvailability[],
): QuoteStockIncident[] {
  const byId = new Map(
    availability.map((item) => [Number(item.idProduct), item]),
  );
  const incidents: QuoteStockIncident[] = [];

  for (const line of lines) {
    const quantity = Math.max(1, Math.round(Number(line.quantity)) || 1);
    const current = byId.get(line.idProduct);
    const reasons: string[] = [];
    const stocksByBranch = Array.isArray(current?.stocksByBranch)
      ? current.stocksByBranch
      : [];
    const stock = Number(current?.stock) || 0;

    if (!current) {
      reasons.push("Ya no está en el catálogo.");
    } else {
      if (current.active !== true) reasons.push("No está activado.");
      if (quantity > stock) {
        reasons.push(
          stocksByBranch.length > 0
            ? `La cantidad ${quantity} supera el stock de las bodegas (${stock}).`
            : `La cantidad ${quantity} supera el stock disponible (${stock}).`,
        );
      }
    }

    if (reasons.length === 0) continue;
    incidents.push({
      idProduct: line.idProduct,
      name: line.name,
      sku: line.sku ?? null,
      quantity,
      reasons,
      stocksByBranch,
    });
  }

  return incidents;
}

export default function QuoteStockWarning({
  incidents,
}: {
  incidents: QuoteStockIncident[];
}) {
  return (
    <div className={styles.incidentWrap}>
      <p className={styles.incidentLead}>
        Estos productos siguen en el carrito. La cantidad ya no entra en el
        stock de sus bodegas, o el producto ya no está activo.
      </p>
      <div className={styles.incidentList}>
        {incidents.map((incident) => (
          <article key={incident.idProduct} className={styles.incidentCard}>
            <strong>{incident.name}</strong>
            {incident.sku ? <span>SKU {incident.sku}</span> : null}
            <ul>
              {incident.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {incident.stocksByBranch.length > 0 ? (
              <div className={styles.stockRow}>
                {incident.stocksByBranch.map((branch) => (
                  <span key={branch.branchId} className={styles.stockChip}>
                    {branch.label} {branch.stock}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
