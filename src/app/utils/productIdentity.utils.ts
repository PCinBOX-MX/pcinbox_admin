export type ProductIdentity = {
  idProduct?: number | string | null;
  idProductExt?: string | number | null;
};

export const isSameProduct = (
  item: ProductIdentity,
  product: ProductIdentity,
) => {
  const a = Number(item.idProduct);
  const b = Number(product.idProduct);
  if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
    return a === b;
  }
  if (
    item.idProductExt != null &&
    product.idProductExt != null &&
    String(item.idProductExt) !== "" &&
    String(product.idProductExt) !== ""
  ) {
    return String(item.idProductExt) === String(product.idProductExt);
  }
  return false;
};

export const productsMatchForMerge = (
  a: ProductIdentity,
  b: ProductIdentity,
) => {
  if (
    a.idProductExt != null &&
    b.idProductExt != null &&
    String(a.idProductExt) !== "" &&
    String(b.idProductExt) !== ""
  ) {
    return String(a.idProductExt) === String(b.idProductExt);
  }
  const idA = Number(a.idProduct);
  const idB = Number(b.idProduct);
  return (
    Number.isFinite(idA) &&
    Number.isFinite(idB) &&
    idA > 0 &&
    idB > 0 &&
    idA === idB
  );
};
