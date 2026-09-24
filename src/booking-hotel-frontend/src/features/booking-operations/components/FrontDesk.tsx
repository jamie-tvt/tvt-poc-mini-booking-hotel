"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePortalHotel } from "@/features/hotel-management/context/PortalHotelContext";
import { isValidYmd } from "@/lib/utils/stay";
import { StayTable } from "./StayTable";
import { useBusinessToday } from "./useBusinessToday";
import { useFrontDeskData } from "./useFrontDeskData";

type TabKey = "arrivals" | "departures" | "in-house" | "overdue";
const TAB_KEYS: TabKey[] = ["arrivals", "departures", "in-house", "overdue"];

/** Màn lễ tân: khách đến / khách đi theo ngày, khách đang ở, đơn quá hạn chưa đến. */
export function FrontDesk() {
  const sp = useSearchParams();
  const initialTab = TAB_KEYS.includes(sp?.get("tab") as TabKey) ? (sp?.get("tab") as TabKey) : "arrivals";
  const { hotel, hotelId } = usePortalHotel();
  const today = useBusinessToday();
  const [date, setDate] = useState(today);
  const [touched, setTouched] = useState(false);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);

  // Ngày nghiệp vụ có thể đổi (đồng hồ demo) — theo nó cho tới khi lễ tân tự chọn ngày.
  useEffect(() => {
    if (!touched) setDate(today);
  }, [today, touched]);

  const validDate = isValidYmd(date) ? date : today;
  const q = useFrontDeskData(hotelId, validDate, today);
  const d = q.data;

  const onChanged = (_: unknown, message: string) => {
    setNotice(message);
    void q.reload();
  };

  const items = [
    { key: "arrivals" as const, label: "Khách đến", count: d?.arrivals.length },
    { key: "departures" as const, label: "Khách đi", count: d?.departures.length },
    { key: "in-house" as const, label: "Đang ở", count: d?.inHouse.length },
    { key: "overdue" as const, label: "Quá hạn chưa đến", count: d?.overdue.length },
  ];

  return (
    <div>
      <PageHeader title="Lễ tân" description={hotel ? hotel.name : undefined} />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <TextField
          id="fd-date"
          type="date"
          label="Ngày"
          value={date}
          onChange={(e) => {
            setTouched(true);
            setDate(e.target.value);
          }}
          containerClassName="w-full sm:w-52"
        />
        <Button
          variant="ghost"
          onClick={() => {
            setTouched(false);
            setDate(today);
          }}
          disabled={date === today}
        >
          Về hôm nay
        </Button>
        <Button variant="secondary" onClick={() => void q.reload()} loading={q.loading} className="sm:ml-auto">
          <RefreshCw className="size-4" aria-hidden="true" /> Làm mới
        </Button>
      </div>
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      <Tabs label="Danh sách lễ tân" items={items} value={tab} onChange={setTab} idPrefix="fd" />
      <TabPanel idPrefix="fd" activeKey={tab}>
        {q.loading && !d ? (
          <Spinner />
        ) : q.error || !d ? (
          <ErrorState message={q.error?.message} />
        ) : tab === "arrivals" ? (
          <StayTable caption="Khách đến" bookings={d.arrivals} today={today} onChanged={onChanged} emptyText="Không có khách nhận phòng trong ngày này." />
        ) : tab === "departures" ? (
          <StayTable caption="Khách đi" bookings={d.departures} today={today} onChanged={onChanged} emptyText="Không có khách trả phòng trong ngày này." />
        ) : tab === "in-house" ? (
          <StayTable caption="Khách đang ở" bookings={d.inHouse} today={today} onChanged={onChanged} emptyText="Chưa có khách đang lưu trú." />
        ) : (
          <StayTable
            caption="Đơn quá ngày nhận phòng chưa đến"
            bookings={d.overdue}
            today={today}
            onChanged={onChanged}
            emptyText="Không có đơn quá hạn nhận phòng."
          />
        )}
      </TabPanel>
    </div>
  );
}
