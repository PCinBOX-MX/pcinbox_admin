export type OrderCancellationCode =
  | "OK"
  | "ALREADY_CANCELLED"
  | "ORDER_NOT_PAID"
  | "SHIPMENT_STATUS"
  | "TECHSMART_WINDOW"
  | "TECHSMART_SENT"
  | "DICOTECH_PROCESSING";

export type CanCancelOrderResult = {
  canCancel: boolean;
  reason: string | null;
  code: OrderCancellationCode;
  hasTechsmartProducts: boolean;
  hasDicotechProducts: boolean;
  cancelDeadline: string | null;
  hoursRemaining: number | null;
  techsmartBlocked: boolean;
};
