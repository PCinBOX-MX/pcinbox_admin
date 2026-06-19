export type TechsmartOrderStatus =
  | "pending"
  | "sent"
  | "guide_linked"
  | "invoiced"
  | "error";

export interface TechsmartOrderI {
  idTechsmartOrder: number;
  idOrder: number;
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
  techsmartOrder: TechsmartOrderI | null;
  canGenerate: boolean;
  canLinkGuide: boolean;
  canInvoice: boolean;
}
