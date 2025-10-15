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
  idShipment: number;
  idUser: number;
  idOrder: number;
  name: string;
  method_pay: string;
  products: { quantity: number; description: string; productName: string }[];
  totalAmount: string;
  address: string;
  statusPay: statusPay;
  statusShip: statusShip;
}
