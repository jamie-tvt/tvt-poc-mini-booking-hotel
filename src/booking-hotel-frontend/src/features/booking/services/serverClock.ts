import { api } from "@/lib/api/client";
import type { DemoClockDto } from "@/types/domain";

let skewPromise: Promise<number> | null = null;

/**
 * Độ lệch (ms) giữa đồng hồ nghiệp vụ của backend và máy khách.
 * Backend có thể dời giờ bằng /demo/clock → đồng hồ đếm ngược phải theo giờ server.
 * Không có công cụ demo (404) → 0.
 */
export function getServerSkewMs(): Promise<number> {
  if (!skewPromise) {
    skewPromise = api
      .get<DemoClockDto>("/demo/clock", undefined, { auth: false })
      .then((c) => (c?.now ? new Date(c.now).getTime() - Date.now() : 0))
      .catch(() => 0);
  }
  return skewPromise;
}

export function resetServerSkew(): void {
  skewPromise = null;
}
