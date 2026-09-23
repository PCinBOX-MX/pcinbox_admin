export interface ProductsI {
  idProduct: number;
  idProductExt: any;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  rating: number;
  image_url: string[];
  categoryId: number;
  marcaId?: number;
  providerId: number;
  createdat: string;
  nameMarca?: string;
  nameCategory?: string;
  upc?: string;
  isPc?: any;
  stockBranches?: any;
  width?: any;
  height?: any;
  largo?: any;
  peso?: any;
  profitMargin?: any;
  branches?: any;
  active?: number;
  licenseType?: "windows" | "antivirus" | "office" | null;
  caracteristicas?: {
    prop: string;
    value: string;
  }[];
  /** Precio proveedor en MXN (ya convertido con Banxico si aplica). */
  originPriceMxn?: number;
  precioOriginal?: number;
  moneda?: string;
  isDolares?: boolean;
  tipoCambio?: number | null;
  warrantyMonths?: number | null;
  warrantyMode?: string | null;
}
