import { ProductsI } from "../products/products.interface";

type Status = "payment_pending" | "paid" | "cancelled" | "expired";

export interface LinkPagosI {
  monto: number;
  chargeId: any;
  customerId: any;
  description: string;
  email: string;
  lastname: string;
  name: string;
  referencia: string;
  status: Status;
  linkPago: string;
  products: any[];
  phone: string;
}
