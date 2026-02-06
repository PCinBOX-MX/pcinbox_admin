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
  caracteristicas?: {
    prop: string;
    value: string;
  }[];
}
