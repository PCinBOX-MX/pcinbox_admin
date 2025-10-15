export interface ProductsI {
  idProduct: number;
  idProductExt: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  rating: number;
  image_url: string[];
  categoryId: number;
  providerId: number;
  createdat: string;
}
