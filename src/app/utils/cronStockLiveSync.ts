import { ProductsI } from "../interfaces/products/products.interface";



export type CronStockUpdate = {

  idProduct: number;

  price?: number;

  stock?: number;

  active?: number;

  branches?: Record<string, number>;

};



function normalizeBranchKey(key: string): string {

  return String(key || "")

    .trim()

    .toUpperCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "");

}



function sumBranchMap(branches: Record<string, number>): number {

  return Object.values(branches).reduce(

    (sum, qty) => sum + Math.max(0, Number(qty) || 0),

    0,

  );

}



/** Patch `branches` when it's an array of { name, stock, ... }. */

function patchBranchesArray(

  current: unknown,

  branchMap: Record<string, number>,

): unknown {

  if (!Array.isArray(current) || current.length === 0) return current;

  const normalized = Object.fromEntries(

    Object.entries(branchMap).map(([k, v]) => [

      normalizeBranchKey(k),

      Math.max(0, Number(v) || 0),

    ]),

  );

  return current.map((row: any) => {

    const nameKey = normalizeBranchKey(

      String(row?.name ?? row?.label ?? row?.city ?? ""),

    );

    const idKey = normalizeBranchKey(String(row?.branchId ?? row?.id ?? ""));

    const match =

      (nameKey && nameKey in normalized

        ? normalized[nameKey]

        : undefined) ??

      (idKey && idKey in normalized ? normalized[idKey] : undefined);

    if (match == null) return row;

    return { ...row, stock: match };

  });

}



export function normalizeCronStockPayload(

  payload: unknown,

): CronStockUpdate[] {

  const rows = Array.isArray(payload) ? payload : [payload];

  return rows

    .filter((row) => row != null && (row as CronStockUpdate).idProduct != null)

    .map((row) => {

      const r = row as CronStockUpdate;

      return {

        idProduct: Number(r.idProduct),

        // Solo price de products (nunca providerPrice).

        price: r.price != null ? Number(r.price) : undefined,

        stock: r.stock != null ? Number(r.stock) : undefined,

        active: r.active != null ? Number(r.active) : undefined,

        branches: r.branches,

      };

    });

}



/** Aplica price / stock / active / branches del cron a un producto del admin. */

export function applyCronStockUpdate<T extends ProductsI>(

  product: T,

  update: CronStockUpdate,

): T {

  if (Number(product.idProduct) !== Number(update.idProduct)) return product;



  const next: T = { ...product };



  if (update.price != null && Number.isFinite(update.price)) {

    (next as ProductsI).price = update.price as any;

  }



  if (update.branches && Object.keys(update.branches).length > 0) {

    (next as any).stockBranches = update.branches;

    (next as any).branches = patchBranchesArray(

      (product as any).branches,

      update.branches,

    );

    (next as ProductsI).stock = sumBranchMap(update.branches) as any;

  } else if (update.stock != null && Number.isFinite(update.stock)) {

    (next as ProductsI).stock = update.stock as any;

  }



  if (update.active != null && Number.isFinite(update.active)) {

    (next as ProductsI).active = Number(update.active);

  }



  return next;

}



export function applyCronStockUpdates<T extends ProductsI>(

  product: T,

  updates: CronStockUpdate[],

): T {

  return updates.reduce(

    (current, update) => applyCronStockUpdate(current, update),

    product,

  );

}


