export interface CotizacionCustomer {
  name: string;
  email: string;
}

export interface Cotizacion {
  idCotizacion: number | string;
  quoteNumber: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  totalAmount: number;
  itemCount: number;
  includeAssemblyService: boolean;
  createdAt: string;
  expiresAt: string;
  userId: number | string;
  customer: CotizacionCustomer;
}

export interface CotizacionesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CotizacionesAdminResponse {
  ok: boolean;
  data: Cotizacion[];
  pagination: CotizacionesPagination;
}
