import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { LinkButton } from "@/components/ui/Button";
import { CheckoutForm } from "@/features/booking/components/CheckoutForm";

import { hotelServer } from "@/features/search/services/hotelServer";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { firstParam, toQueryString } from "@/lib/utils/query";
import { stayFromParams, todayVn, validateStay } from "@/lib/utils/stay";
import type { HotelDetailDto } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đặt phòng" };

type SP = Promise<Record<string, string | string[] | undefined>>;

/**
 * /checkout?hotelId&roomTypeId&checkIn&checkOut&guests&rooms — guest checkout.
 * (Hợp đồng không có API công khai lấy 1 loại phòng theo id nên URL mang thêm hotelId để đọc GET /hotels/{id}.)
 */
export default async function CheckoutPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const hotelId = firstParam(sp.hotelId);
  const roomTypeId = Number(firstParam(sp.roomTypeId));
  const stay = stayFromParams({
    checkIn: firstParam(sp.checkIn),
    checkOut: firstParam(sp.checkOut),
    guests: firstParam(sp.guests),
    rooms: firstParam(sp.rooms),
  });
  const today = todayVn();
  const backHref = hotelId ? `/hotels/${hotelId}${toQueryString({ ...stay })}#rooms` : "/hotels";

  const stayErrors = validateStay(stay, today, true);
  if (!hotelId || !/^\d+$/.test(hotelId) || !Number.isInteger(roomTypeId) || roomTypeId <= 0) {
    return (
      <ErrorState
        title="Chưa chọn phòng"
        message="Thiếu thông tin khách sạn hoặc loại phòng. Vui lòng chọn lại phòng muốn đặt."
        action={<LinkButton href="/hotels">Tìm khách sạn</LinkButton>}
      />
    );
  }
  if (Object.keys(stayErrors).length) {
    return (
      <ErrorState
        title="Ngày lưu trú chưa hợp lệ"
        message={Object.values(stayErrors)[0]}
        action={<LinkButton href={backHref}>Chọn lại ngày</LinkButton>}
      />
    );
  }

  let hotel: HotelDetailDto;
  try {
    hotel = await hotelServer.detail(hotelId, {
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      guests: String(stay.guests),
      rooms: String(stay.rooms),
    });
  } catch (e) {
    return (
      <ErrorState
        title={e instanceof ApiError && e.status === 404 ? "Khách sạn không còn nhận đặt phòng" : undefined}
        message={errorMessage(e, undefined)}
        action={<LinkButton href="/hotels">Tìm khách sạn khác</LinkButton>}
      />
    );
  }
  const room = hotel.roomTypes.find((r) => r.id === roomTypeId);

  return (
    <div>
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Quay lại chọn phòng
      </Link>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Hoàn tất đặt phòng</h1>
      <p className="mb-6 mt-1 text-ink-soft">Điền thông tin người nhận phòng — không cần tạo tài khoản.</p>
      {!room ? (
        <ErrorState
          title="Không tìm thấy loại phòng"
          message="Loại phòng này không còn mở bán. Vui lòng chọn phòng khác."
          action={<LinkButton href={backHref}>Chọn phòng khác</LinkButton>}
        />
      ) : room.availableRooms != null && room.availableRooms < stay.rooms ? (
        <ErrorState
          title="Không đủ phòng trống"
          message={
            room.availableRooms <= 0
              ? "Loại phòng này đã hết trong khoảng ngày bạn chọn."
              : `Chỉ còn ${room.availableRooms} phòng trong khoảng ngày bạn chọn.`
          }
          action={<LinkButton href={backHref}>Chọn phòng khác</LinkButton>}
        />
      ) : (
        <CheckoutForm hotel={hotel} room={room} stay={stay} today={today} />
      )}
    </div>
  );
}
