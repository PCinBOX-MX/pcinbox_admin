import { CronStockUpdate } from "../utils/cronStockLiveSync";

type BranchStock = {
  branchId: number;
  label: string;
  stock: number;
};

type LiveFields = {
  idProduct: number;
  price: number;
  stock?: number;
  active?: boolean;
  stocksByBranch?: BranchStock[];
};

const DISPLAY_KEYS: Record<string, readonly string[]> = {
  "pcinbox-gdl": ["gdl"],
  "pcinbox-cdmx": ["cdmx"],
  "pcinbox-sfd": ["santafe"],
  "pcinbox-leon": ["leon2", "leon"],
  "pcinbox-ag2d": ["dicoags2"],
  "pcinbox-agd": ["arboledas"],
};

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function matchBranchStock(
  label: string,
  branchId: number,
  branches: Record<string, number>,
): number | null {
  const labelKey = norm(label);
  const aliases = DISPLAY_KEYS[labelKey] ?? [];
  const idKey = String(branchId);
  for (const [rawKey, qty] of Object.entries(branches)) {
    const key = norm(rawKey);
    if (!key) continue;
    const hit =
      key === labelKey ||
      key === idKey ||
      aliases.includes(key) ||
      (key.length >= 3 && (labelKey.includes(key) || key.includes(labelKey)));
    if (!hit) continue;
    return Math.max(0, Number(qty) || 0);
  }
  return null;
}

function patchLiveFields<T extends LiveFields>(
  line: T,
  update: CronStockUpdate,
): T {
  if (Number(line.idProduct) !== Number(update.idProduct)) return line;

  let price = line.price;
  let stock = Number(line.stock) || 0;
  let active = line.active;
  let stocksByBranch = line.stocksByBranch ?? [];
  let touched = false;

  if (update.price != null && Number.isFinite(update.price) && update.price >= 0) {
    const nextPrice = Math.round((update.price + Number.EPSILON) * 100) / 100;
    if (nextPrice !== price) {
      price = nextPrice;
      touched = true;
    }
  }

  if (update.active === 0 || update.active === 1) {
    const nextActive = update.active === 1;
    if (nextActive !== active) {
      active = nextActive;
      touched = true;
    }
  }

  if (update.branches && Object.keys(update.branches).length > 0 && stocksByBranch.length > 0) {
    let branchChanged = false;
    const nextBranches = stocksByBranch.map((branch) => {
      const nextStock = matchBranchStock(branch.label, branch.branchId, update.branches!);
      if (nextStock == null || nextStock === branch.stock) return branch;
      branchChanged = true;
      return { ...branch, stock: nextStock };
    });
    if (branchChanged) {
      stocksByBranch = nextBranches;
      stock = nextBranches.reduce((sum, branch) => sum + branch.stock, 0);
      touched = true;
    }
  } else if (
    update.stock != null &&
    Number.isFinite(update.stock) &&
    stocksByBranch.length === 0
  ) {
    const nextStock = Math.max(0, update.stock);
    if (nextStock !== stock) {
      stock = nextStock;
      touched = true;
    }
  }

  if (!touched) return line;
  return { ...line, price, stock, active, stocksByBranch };
}

export function patchQuoteLiveLines<T extends LiveFields>(
  lines: T[],
  updates: CronStockUpdate[],
): T[] | null {
  if (lines.length === 0 || updates.length === 0) return null;
  const byId = new Map(updates.map((update) => [Number(update.idProduct), update]));
  let changed = false;
  const next = lines.map((line) => {
    const update = byId.get(Number(line.idProduct));
    if (!update) return line;
    const patched = patchLiveFields(line, update);
    if (patched !== line) changed = true;
    return patched;
  });
  return changed ? next : null;
}
