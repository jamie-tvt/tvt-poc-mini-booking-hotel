/** Bọc mọi response của backend (xem docs/technical/api-contracts.md §1). */
export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  code: string;
  message: string;
  requestId?: string;
  timestamp?: string;
  data: T;
  errors: ApiFieldError[] | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;
