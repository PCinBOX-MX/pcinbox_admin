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
): string {
  const apiPage = page + 1;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}page=${apiPage}&pageSize=${pageSize}`;
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
