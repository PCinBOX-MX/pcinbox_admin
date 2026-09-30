enum statusShip {
  entregado,
  cancelado,
  enviado,
  procesando,
}

enum statusPay {
  paid,
  pending,
  payment_pending,
  cancelled,
  rejected,
  refunded,
  charged_back,
}

export interface SalesI {
  idOrder: number;
  dataUser: {
    name: string;
    lastName: any;
    email: string;
    phone?: string | null;
    phone1: any;
    phone2: any;
    addressPhones?: string[];
  };
  method_pay: any;
  idUser: any;
  products: {
    idSale?: number;
    productName: string;
    description: string;
    quantity: number;
    lineTotal?: number;
    /** Precio proveedor sin IVA (products_providers.price). Solo Dicotech. */
    providerPrice?: number | null;
    upc: string;
    sku: string;
    idProductExt?: string | number | null;
    providerId?: number;
    purchaseId?: string | null;
    invoiceNumber?: string | null;
    licenseType?: string | null;
    statusShip: any;
    statusChangedAt?: string | null;
    licenseDeliveredAt?: string | null;
    idShipment: number;
    address: null | {
      street: string;
      noExt: string;
      noInt: any;
      cologne: string;
      cp: string;
      city: string;
      state: string;
      country: string;
      storeId: number;
      shipping_method: any;
      requireInsurance: number;
      shippingCost?: number;
      insuranceCost?: number;
      trackingNumber: any;
      phone1?: string | null;
      phone2?: string | null;
      branche: any;
      originBranche?: string | null;
    };
  }[];
  totalAmount: any;
  shippingTotal?: number;
  insuranceTotal?: number;
  statusPay: any;
  statusShip: any;
  orderStatus?: string | null;
  cancelReason?: string | null;
  billing: any;
  requiredFactura: number;
  createdAt: string;
  updatedAt: string;
  id: number;
  hasTechsmartProducts?: boolean;
  hasDicotechPendingProducts?: boolean;
  techsmartOrder?: {
    idTechsmartOrder: number;
    idOrder: number;
    numOrdenCompra: string | null;
    folioPedido: string | null;
    guiaPedido: string | null;
    nombrePaqueteria: string | null;
    folioFactura: string | null;
    fechaFactura: string | null;
    plazoFactura: string | null;
    status: string;
    wsError: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}
