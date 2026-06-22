"use client";

import {
  ModalDetailField,
  ModalDetailGrid,
} from "../modal/ModalDetail";

export function CustomerDetailsContent({ data }: { data: any }) {
  if (!data) {
    return <p className="admin-modal-empty">Sin datos del cliente.</p>;
  }

  return (
    <ModalDetailGrid columns={2}>
      <ModalDetailField
        label="Nombre completo"
        value={`${data.name ?? ""} ${data.lastName ?? ""}`.trim()}
        fullWidth
      />
      <ModalDetailField label="Correo electrónico" value={data.email} />
      <ModalDetailField label="Teléfono principal" value={data.phone1} />
      <ModalDetailField label="Teléfono secundario" value={data.phone2} />
    </ModalDetailGrid>
  );
}

export function BillingDetailsContent({ billing }: { billing: any[] }) {
  const data = billing?.[0];

  if (!data) {
    return <p className="admin-modal-empty">Sin datos de facturación.</p>;
  }

  return (
    <ModalDetailGrid columns={3}>
      <ModalDetailField label="CFDI" value={data.cfdi} />
      <ModalDetailField label="Compañía" value={data.companyName} />
      <ModalDetailField label="Correo" value={data.email} />
      <ModalDetailField label="Método de pago" value={data.methodPay} />
      <ModalDetailField label="No. orden" value={data.orden} />
      <ModalDetailField label="RFC" value={data.rfc} />
      <ModalDetailField label="Régimen fiscal" value={data.taxRegimen} />
      <ModalDetailField label="Código postal" value={data.codePostal} />
      <ModalDetailField label="Estado" value={data.state} />
      <ModalDetailField label="Ciudad" value={data.city} fullWidth />
    </ModalDetailGrid>
  );
}

export const modalCloseOnly = {
  showActions: true,
  showCancel: false,
  confirmLabel: "Cerrar",
} as const;

export function InvitadoProductsContent({ products }: { products: any[] }) {
  if (!Array.isArray(products) || products.length === 0) {
    return <p className="admin-modal-empty">Sin productos en esta orden.</p>;
  }

  return (
    <div className="admin-modal-products">
      {products.map((item: any, index: number) => (
        <article
          key={item.idProduct ?? item.sku ?? index}
          className="admin-product-card"
        >
          <header className="admin-product-card__header">
            <div className="admin-product-card__title-wrap">
              <span className="admin-product-card__index">
                Producto {index + 1}
              </span>
              <h3 className="admin-product-card__name">{item.name}</h3>
              {item.description ? (
                <p className="admin-product-card__description">
                  {item.description}
                </p>
              ) : null}
            </div>
            <span className="admin-product-card__qty">× {item.quantity}</span>
          </header>

          <ModalDetailGrid columns={2}>
            {item.sku ? (
              <ModalDetailField label="SKU" value={item.sku} />
            ) : null}
            {item.upc ? (
              <ModalDetailField label="UPC" value={item.upc} />
            ) : null}
            {item.clave ? (
              <ModalDetailField label="Clave" value={item.clave} />
            ) : null}
            <ModalDetailField
              label="Cantidad"
              value={String(item.quantity)}
              highlight
            />
          </ModalDetailGrid>
        </article>
      ))}
    </div>
  );
}
