export type OrderProductRow = {
  idSale?: number;
  idShipment?: number | null;
  productName?: string;
  quantity?: number;
  statusShip?: string | null;
  licenseType?: string | null;
  shipping_method?: string | null;
  upc?: string | null;
  sku?: string | null;
  idProductExt?: string | number | null;
  address?: {
    shipping_method?: string | null;
    street?: string | null;
    noExt?: string | null;
    noInt?: string | null;
    cologne?: string | null;
    cp?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    requireInsurance?: number | null;
    trackingNumber?: string | null;
    branche?: string | null;
    originBranche?: string | null;
    storeId?: number | null;
  } | null;
  lineTotal?: number;
  total?: number;
  [key: string]: unknown;
};

export type ShipmentGroup = {
  key: string;
  idShipment: number | null;
  isDigital: boolean;
  title: string;
  subtitle: string;
  shippingMethod: string | null;
  /** Bodega de origen del envío (products_providers / branches.name). */
  originBranche: string | null;
  address: OrderProductRow["address"];
  products: OrderProductRow[];
  statusShip: string;
  trackingNumber?: string | null;
};

const SHIPPING_LABELS: Record<string, string> = {
  sucursal: "Recoger en sucursal PCinBox-León",
  sucursalext: "Recoger en sucursal PCinBox-León",
  estafeta: "Estafeta",
  paqueteexpress: "Paquete Express",
  envioleon: "Envío personalizado PCinBOX",
  digital: "Entrega digital (licencia)",
};

export function isLicenseProduct(item: OrderProductRow): boolean {
  const licenseType = String(item?.licenseType ?? "").toLowerCase();
  return (
    licenseType === "windows" ||
    licenseType === "antivirus" ||
    licenseType === "office" ||
    licenseType === "digital"
  );
}

export function isDigitalDeliveryProduct(item: OrderProductRow): boolean {
  const method = String(
    item?.address?.shipping_method ?? item?.shipping_method ?? "",
  ).toLowerCase();
  return method === "digital" || isLicenseProduct(item);
}

export function getShippingLabel(method?: string | null): string {
  const key = String(method ?? "").toLowerCase();
  return SHIPPING_LABELS[key] ?? (key ? `Envío (${method})` : "Envío");
}

function resolveGroupStatus(products: OrderProductRow[]): string {
  const statuses = products.map((item) =>
    String(item.statusShip || "procesando").toLowerCase(),
  );
  if (!statuses.length) return "procesando";
  if (statuses.every((status) => status === statuses[0])) {
    return statuses[0];
  }
  const rank: Record<string, number> = {
    cancelado: 0,
    procesando: 1,
    disponible: 2,
    enviado: 3,
    entregado: 4,
  };
  return [...statuses].sort((a, b) => (rank[a] ?? 0) - (rank[b] ?? 0))[0];
}

export function groupOrderProductsByShipment(
  products: OrderProductRow[],
): { physical: ShipmentGroup[]; digital: ShipmentGroup[] } {
  const map = new Map<string, ShipmentGroup>();

  products.forEach((item, index) => {
    const idShipment =
      item.idShipment != null && Number(item.idShipment) > 0
        ? Number(item.idShipment)
        : null;
    const key =
      idShipment != null ? `shipment-${idShipment}` : `orphan-${index}`;
    const isDigital = isDigitalDeliveryProduct(item);
    const shippingMethod =
      item.address?.shipping_method ?? item.shipping_method ?? null;

    const existing = map.get(key);
    if (existing) {
      existing.products.push(item);
      existing.statusShip = resolveGroupStatus(existing.products);
      if (!existing.originBranche) {
        existing.originBranche =
          item.address?.originBranche ?? item.address?.branche ?? null;
      }
      return;
    }

    const title = isDigital
      ? "Licencias digitales"
      : idShipment != null
        ? `Envío #${idShipment}`
        : "Productos sin bloque de envío";

    const subtitle = isDigital
      ? "Las claves se envían con el correo de activación (no usa estatus de paquetería)."
      : getShippingLabel(shippingMethod);

    const originBranche =
      item.address?.originBranche ?? item.address?.branche ?? null;

    map.set(key, {
      key,
      idShipment,
      isDigital,
      title,
      subtitle,
      shippingMethod: shippingMethod ? String(shippingMethod) : null,
      originBranche: originBranche ? String(originBranche) : null,
      address: item.address ?? null,
      products: [item],
      statusShip: String(item.statusShip || "procesando").toLowerCase(),
      trackingNumber: (item.address as any)?.trackingNumber ?? null,
    });
  });

  const groups = [...map.values()].map((group) => ({
    ...group,
    statusShip: resolveGroupStatus(group.products),
  }));

  return {
    physical: groups.filter((group) => !group.isDigital),
    digital: groups.filter((group) => group.isDigital),
  };
}

export function filterPhysicalProducts(
  products: OrderProductRow[],
): OrderProductRow[] {
  return products.filter((item) => !isDigitalDeliveryProduct(item));
}
