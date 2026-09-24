"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePortalHotel } from "../context/PortalHotelContext";
import { portalHotelService } from "../services/portalHotelService";
import { HotelForm } from "./HotelForm";

export function NewHotel() {
  const router = useRouter();
  const { reload, setHotelId } = usePortalHotel();
  return (
    <div>
      <Link href="/portal/hotels" className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Khách sạn của tôi
      </Link>
      <PageHeader title="Đăng ký khách sạn mới" description="Sau khi gửi, khách sạn ở trạng thái Chờ duyệt cho tới khi quản trị viên phê duyệt." />
      <Card>
        <HotelForm
          submitLabel="Gửi đăng ký"
          onSubmit={portalHotelService.createHotel}
          onDone={async (h) => {
            await reload();
            setHotelId(h.id);
            router.push("/portal/hotels?created=1");
          }}
        />
      </Card>
    </div>
  );
}
