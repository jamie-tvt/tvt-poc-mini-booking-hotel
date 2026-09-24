"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/shared/ErrorState";
import { HotelStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { useApiQuery } from "@/lib/api/hooks";
import { usePortalHotel } from "../context/PortalHotelContext";
import { portalHotelService } from "../services/portalHotelService";
import { HotelForm } from "./HotelForm";
import { PriceManager } from "./PriceManager";
import { RoomManager } from "./RoomManager";
import { RoomTypeManager } from "./RoomTypeManager";
import { StaffManager } from "./StaffManager";

type TabKey = "info" | "room-types" | "rooms" | "prices" | "staff";
const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Thông tin" },
  { key: "room-types", label: "Loại phòng" },
  { key: "rooms", label: "Phòng" },
  { key: "prices", label: "Giá theo ngày" },
  { key: "staff", label: "Nhân viên" },
];

/** Quản lý 1 khách sạn (owner): hồ sơ, loại phòng, số phòng, giá theo ngày, nhân viên. */
export function HotelEditor({ id }: { id: number }) {
  const { hotels, loading, error, reload } = usePortalHotel();
  const [tab, setTab] = useState<TabKey>("info");
  const [notice, setNotice] = useState<string | null>(null);
  const hotel = hotels.find((h) => h.id === id);
  const roomTypes = useApiQuery(`portal-room-types-${id}`, () => portalHotelService.roomTypes(id), !!hotel);
  // Danh sách /portal/hotels chỉ có thông tin tóm tắt → lấy hồ sơ đầy đủ để sửa (lỗi thì dùng bản tóm tắt).
  const detail = useApiQuery(`portal-hotel-${id}`, () => portalHotelService.hotel(id), !!hotel);

  if (loading && !hotel) return <Spinner />;
  if (error) return <ErrorState message={error.message} />;
  if (!hotel) return <ErrorState title="Không tìm thấy khách sạn" message="Khách sạn không tồn tại hoặc không thuộc tài khoản của bạn." />;

  return (
    <div>
      <Link href="/portal/hotels" className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Khách sạn của tôi
      </Link>
      <div className="mb-4 mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{hotel.name}</h1>
        <HotelStatusBadge status={hotel.status} />
        {hotel.status === "ACTIVE" && (
          <Link href={`/hotels/${hotel.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Xem trang công khai <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {hotel.status === "REJECTED" && (
        <Alert tone="warning" className="mb-4" title="Khách sạn bị từ chối">
          {hotel.rejectReason ? `Lý do: ${hotel.rejectReason}. ` : ""}Cập nhật hồ sơ ở tab Thông tin — khách sạn sẽ tự chuyển về Chờ duyệt.
        </Alert>
      )}
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      <Tabs label="Quản lý khách sạn" items={TABS} value={tab} onChange={setTab} idPrefix="he" />
      <TabPanel idPrefix="he" activeKey={tab}>
        {tab === "info" && (
          <Card>
            {detail.loading && !detail.data ? (
              <Spinner label="Đang tải hồ sơ khách sạn…" />
            ) : (
            <HotelForm
              key={detail.data ? "detail" : "summary"}
              initial={detail.data ?? hotel}
              submitLabel="Lưu thông tin"
              onSubmit={(p) => portalHotelService.updateHotel(hotel.id, p)}
              onDone={(h) => {
                setNotice(h.status === "PENDING_APPROVAL" && hotel.status === "REJECTED" ? "Đã lưu và gửi duyệt lại." : "Đã lưu thông tin khách sạn.");
                void reload();
                void detail.reload();
              }}
            />
            )}
          </Card>
        )}
        {tab === "room-types" && <RoomTypeManager hotelId={hotel.id} query={roomTypes} />}
        {tab === "rooms" && <RoomManager roomTypes={roomTypes.data ?? []} loading={roomTypes.loading} />}
        {tab === "prices" && <PriceManager hotelId={hotel.id} roomTypes={roomTypes.data ?? []} loading={roomTypes.loading} />}
        {tab === "staff" && <StaffManager hotelId={hotel.id} />}
      </TabPanel>
    </div>
  );
}
