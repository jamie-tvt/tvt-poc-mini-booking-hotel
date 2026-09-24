"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./errors";

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T | undefined)) => void;
}

/**
 * Tải dữ liệu phía client. `key` đổi → tải lại. `enabled=false` → không gọi.
 * Bỏ kết quả cũ nếu có lời gọi mới hơn (tránh race khi đổi bộ lọc nhanh).
 */
export function useApiQuery<T>(key: string, fetcher: () => Promise<T>, enabled = true): QueryState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === seq.current) setDataState(result);
    } catch (e) {
      if (id === seq.current) {
        setError(e instanceof ApiError ? e : new ApiError(0, "UNKNOWN", "Đã có lỗi xảy ra, vui lòng thử lại."));
      }
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [key, enabled, load]);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T | undefined)) => {
    setDataState((prev) =>
      typeof updater === "function" ? (updater as (p: T | undefined) => T | undefined)(prev) : updater,
    );
  }, []);

  return { data, error, loading, reload: load, setData };
}

export interface MutationState<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: ApiError | null;
  fieldErrors: Record<string, string>;
  reset: () => void;
}

/** Bọc 1 thao tác ghi: theo dõi pending, lỗi chung và lỗi theo field. Trả undefined nếu lỗi. */
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>): MutationState<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: A) => {
    setPending(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, "UNKNOWN", "Đã có lỗi xảy ra, vui lòng thử lại."));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);
  return { run, pending, error, fieldErrors: error?.fieldErrors ?? {}, reset };
}
