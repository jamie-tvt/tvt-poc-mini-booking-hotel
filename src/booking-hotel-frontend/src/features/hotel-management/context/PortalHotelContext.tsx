"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { useApiQuery } from "@/lib/api/hooks";
import type { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PORTAL_HOTEL_KEY } from "@/lib/config/env";
import type { PortalHotelDto } from "@/types/domain";
import { portalHotelService } from "../services/portalHotelService";

interface PortalHotelContextValue {
  hotels: PortalHotelDto[];
  hotel: PortalHotelDto | null;
  hotelId: number | null;
  setHotelId: (id: number) => void;
  loading: boolean;
  error: ApiError | null;
  reload: () => Promise<void>;
}

const PortalHotelContext = createContext<PortalHotelContextValue | null>(null);

function readStoredId(): number | null {
  try {
    const v = Number(window.localStorage.getItem(PORTAL_HOTEL_KEY));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Khách sạn đang thao tác ở Hotel Portal. Staff: khách sạn được gán; owner: chọn (nhớ ở localStorage),
 * mặc định khách sạn đang hoạt động đầu tiên.
 */
export function PortalHotelProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const q = useApiQuery("portal-hotels", portalHotelService.hotels);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => setSelected(readStoredId()), []);

  const setHotelId = useCallback((id: number) => {
    setSelected(id);
    try {
      window.localStorage.setItem(PORTAL_HOTEL_KEY, String(id));
    } catch {
      /* bỏ qua */
    }
  }, []);

  const value = useMemo<PortalHotelContextValue>(() => {
    const hotels = q.data ?? [];
    const pick =
      hotels.find((h) => h.id === selected) ??
      hotels.find((h) => h.id === user?.hotelId) ??
      hotels.find((h) => h.status === "ACTIVE") ??
      hotels[0] ??
      null;
    return { hotels, hotel: pick, hotelId: pick?.id ?? null, setHotelId, loading: q.loading, error: q.error, reload: q.reload };
  }, [q.data, q.loading, q.error, q.reload, selected, user?.hotelId, setHotelId]);

  return <PortalHotelContext.Provider value={value}>{children}</PortalHotelContext.Provider>;
}

export function usePortalHotel(): PortalHotelContextValue {
  const ctx = useContext(PortalHotelContext);
  if (!ctx) throw new Error("usePortalHotel phải nằm trong <PortalHotelProvider>");
  return ctx;
}

/** Chọn khách sạn (chỉ hiện ô chọn khi có nhiều khách sạn). */
export function HotelSwitcher({ id = "portal-hotel" }: { id?: string }) {
  const { hotels, hotelId, hotel, setHotelId, loading } = usePortalHotel();
  if (loading && hotels.length === 0) return <span className="text-sm text-ink-soft">Đang tải khách sạn…</span>;
  if (hotels.length === 0) return <span className="text-sm text-ink-soft">Chưa có khách sạn</span>;
  if (hotels.length === 1) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
        <Building2 className="size-4 text-brand" aria-hidden="true" /> {hotel?.name}
      </span>
    );
  }
  return (
    <div className="mt-1 flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-soft">
        Khách sạn đang xem
      </label>
      <select
        id={id}
        value={hotelId ?? ""}
        onChange={(e) => setHotelId(Number(e.target.value))}
        className="min-h-10 w-full rounded-lg border border-line-strong bg-white px-2 text-sm text-ink focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
            {h.status !== "ACTIVE" ? " (chưa hoạt động)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
