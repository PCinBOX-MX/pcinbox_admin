export type TechsmartOrderStatus =
  | "pending"
  | "sent"
  | "guide_linked"
  | "invoiced"
  | "error";

export type TechsmartGuideStatus = "pending" | "linked" | "failed";

export interface TechsmartGuideI {
  idTechsmartGuide: number;
  idTechsmartOrder: number;
  idOrder: number;
  idSale: number;
  idProduct: number;
  unitIndex: number;
  productName: string;
  requiresOwnGuide: boolean;
  techsmartReference: string | null;
  internalGuideNumber: string;
  trackingNumber?: string | null;
  shippingMethod?: string | null;
  carrierName?: string | null;
  guiaPedido: string | null;
  nombrePaqueteria: string | null;
  status: TechsmartGuideStatus | string;
  wsError: string | null;
  linkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TechsmartOrderI {
  idTechsmartOrder: number;
  idOrder: number;
  numOrdenCompra: string | null;
  folioPedido: string | null;
  guiaPedido: string | null;
  nombrePaqueteria: string | null;
  folioFactura: string | null;
  fechaFactura: string | null;
  plazoFactura: string | null;
  status: TechsmartOrderStatus | string;
  wsError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TechsmartOrderStatusResponse {
  idOrder: number;
  numOrdenCompra: string | null;
  hasNumOrdenCompra: boolean;
  techsmartOrder: TechsmartOrderI | null;
  guides: TechsmartGuideI[];
  guidesSummary: {
    total: number;
    linked: number;
    pending: number;
  };
  requiresGuides: boolean;
  canGeneratePedido: boolean;
  canLinkGuide: boolean;
  canInvoice: boolean;
}
