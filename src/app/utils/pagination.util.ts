export interface PaginationModel {
  page: number;
  pageSize: number;
}

export interface ParsedPaginatedResponse<T> {
  rows: T[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildPaginatedUrl(
  path: string,
  { page, pageSize }: PaginationModel,
  extraParams?: Record<string, string | boolean | number | undefined | null>,
): string {
  const apiPage = page + 1;
  const params = new URLSearchParams({
    page: String(apiPage),
    pageSize: String(pageSize),
  });

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false || value === "") {
        return;
      }
      params.set(key, String(value));
    });
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${params.toString()}`;
}

export function parsePaginatedResponse<T>(
  body: Record<string, unknown> | undefined | null,
): ParsedPaginatedResponse<T> {
  const payload = (body?.data ?? body) as Record<string, unknown> | undefined;
  const pagination = payload?.pagination as
    | Record<string, number>
    | undefined;

  const rows = (payload?.data ?? payload?.users ?? []) as T[];
  const totalRows =
    pagination?.totalRows ??
    (payload?.totalRows as number | undefined) ??
    (payload?.totalSales as number | undefined) ??
    (payload?.totalUsers as number | undefined) ??
    0;

  return {
    rows,
    totalRows,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 25,
    totalPages: pagination?.totalPages ?? 0,
  };
}
