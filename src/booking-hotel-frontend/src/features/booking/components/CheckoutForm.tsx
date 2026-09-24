"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BedDouble, CalendarDays, CircleCheck, CircleX, LockKeyhole, MapPin, Users } from "lucide-react";
import { HotelImage } from "@/components/shared/HotelImage";
import { roomImageFor } from "@/lib/utils/images";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { formatNights, formatStayDateWithWeekday } from "@/lib/utils/format";
import { toQueryString } from "@/lib/utils/query";
import { cancellationLabel, nightsBetween, priceBreakdown } from "@/lib/utils/stay";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { HotelDetailDto, RoomTypeDto } from "@/types/domain";
import { bookingHref, bookingService } from "../services/bookingService";
import { createCheckoutSchema } from "../validators/checkoutSchema";
import { PriceSummary } from "./PriceSummary";

export interface CheckoutStay {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

type GuestForm = { guestName: string; guestEmail: string; guestPhone: string; note: string };

/**
 * Guest checkout (BR-BK-01): không bắt đăng nhập; đã đăng nhập thì điền sẵn tên/email/SĐT.
 * "Giữ phòng và thanh toán" → POST /bookings → /booking/{code}?key={accessKey}.
 */
export function CheckoutForm({
  hotel,
  room,
  stay,
  today,
}: {
  hotel: Pick<HotelDetailDto, "id" | "name" | "city" | "address" | "coverImageUrl" | "checkInTime" | "checkOutTime">;
  room: RoomTypeDto;
  stay: CheckoutStay;
  today: string;
}) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [form, setForm] = useState<GuestForm>({ guestName: "", guestEmail: "", guestPhone: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !user || prefilled.current) return;
    prefilled.current = true;
    setForm((f) => ({
      ...f,
      guestName: f.guestName || user.fullName,
      guestEmail: f.guestEmail || user.email,
      guestPhone: f.guestPhone || user.phone || "",
    }));
  }, [status, user]);

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const price = priceBreakdown(room.nightlyPrices, stay.rooms, room.basePrice, room.stayTotal);
  const backToRooms = `/hotels/${hotel.id}${toQueryString({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests, rooms: stay.rooms })}#rooms`;
  const set = (k: keyof GuestForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const schema = createCheckoutSchema({ today, capacity: room.capacity });
    const parsed = schema.safeParse({
      roomTypeId: room.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      roomsCount: stay.rooms,
      guests: stay.guests,
      ...form,
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setApiError(null);
    setPending(true);
    try {
      const booking = await bookingService.create(parsed.data);
      router.push(bookingHref(booking.bookingCode, booking.accessKey, { new: "1" }));
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, "UNKNOWN", errorMessage(err));
      if (apiErr.errors.length) setErrors(apiErr.fieldErrors);
      setApiError(apiErr);
      setPending(false);
    }
  }

  const stayError = errors.checkIn ?? errors.checkOut ?? errors.guests ?? errors.roomsCount;
  const unavailable = apiError?.code === "ROOM_UNAVAILABLE";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-lg font-bold">Thông tin người đặt</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {status === "authenticated"
              ? "Đã điền sẵn từ tài khoản của bạn, có thể sửa nếu đặt cho người khác."
              : "Không cần tài khoản. Mã đơn và đường dẫn quản lý đơn sẽ gắn với email này."}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              id="co-name"
              label="Họ và tên"
              autoComplete="name"
              value={form.guestName}
              onChange={set("guestName")}
              error={errors.guestName}
              required
              containerClassName="sm:col-span-2"
            />
            <TextField
              id="co-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={form.guestEmail}
              onChange={set("guestEmail")}
              error={errors.guestEmail}
              hint="Dùng để tra cứu lại đơn"
              required
            />
            <TextField
              id="co-phone"
              label="Số điện thoại"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="0901234567"
              value={form.guestPhone}
              onChange={set("guestPhone")}
              error={errors.guestPhone}
              required
            />
            <TextAreaField
              id="co-note"
              label="Ghi chú cho khách sạn"
              hint="Không bắt buộc — VD giờ đến dự kiến, yêu cầu tầng cao"
              value={form.note}
              onChange={set("note")}
              error={errors.note}
              maxLength={500}
              containerClassName="sm:col-span-2"
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Chính sách huỷ phòng</h2>
          <p
            className={`mt-2 flex items-center gap-2 font-semibold ${room.cancellationPolicy === "NON_REFUNDABLE" ? "text-danger" : "text-green-800"}`}
          >
            {room.cancellationPolicy === "NON_REFUNDABLE" ? (
              <CircleX className="size-5" aria-hidden="true" />
            ) : (
              <CircleCheck className="size-5" aria-hidden="true" />
            )}
            {cancellationLabel(room.cancellationPolicy, room.freeCancelDays, stay.checkIn, today)}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            <li>Huỷ khi đơn còn chờ thanh toán luôn miễn phí.</li>
            {room.cancellationPolicy === "FREE_BEFORE_DATE" ? (
              <li>Sau hạn trên, huỷ phòng không được hoàn tiền.</li>
            ) : (
              <li>Đơn đã thanh toán không được hoàn tiền khi huỷ.</li>
            )}
            <li>Không đến nhận phòng (no-show) không được hoàn tiền.</li>
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Card className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-28 shrink-0 overflow-hidden rounded-lg">
              <HotelImage src={roomImageFor(room.name, room.imageUrl)} alt="" fallback="/images/rooms/standard.svg" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-lg font-bold text-ink-strong">{hotel.name}</p>
              <p className="flex items-start gap-1 text-sm text-ink-soft">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {hotel.city}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-ink">
                <BedDouble className="size-4 text-brand" aria-hidden="true" /> {room.name}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-sm">
            <dt className="flex items-center gap-1.5 text-ink-soft">
              <CalendarDays className="size-4" aria-hidden="true" /> Nhận phòng
            </dt>
            <dd className="text-right">
              {formatStayDateWithWeekday(stay.checkIn)} <span className="text-ink-soft">từ {hotel.checkInTime}</span>
            </dd>
            <dt className="flex items-center gap-1.5 text-ink-soft">
              <CalendarDays className="size-4" aria-hidden="true" /> Trả phòng
            </dt>
            <dd className="text-right">
              {formatStayDateWithWeekday(stay.checkOut)} <span className="text-ink-soft">trước {hotel.checkOutTime}</span>
            </dd>
            <dt className="flex items-center gap-1.5 text-ink-soft">
              <Users className="size-4" aria-hidden="true" /> Khách, phòng
            </dt>
            <dd className="text-right">
              {stay.guests} khách · {stay.rooms} phòng · {formatNights(nights)}
            </dd>
          </dl>
          <div className="border-t border-line pt-3">
            <PriceSummary breakdown={price} rooms={stay.rooms} />
          </div>

          {stayError && <Alert tone="error">{stayError}</Alert>}
          {apiError && (
            <Alert
              tone="error"
              title={unavailable ? "Loại phòng này vừa hết trong khoảng ngày bạn chọn" : "Chưa giữ được phòng"}
              action={
                unavailable ? (
                  <LinkButton href={backToRooms} size="sm" variant="secondary">
                    Chọn phòng khác
                  </LinkButton>
                ) : undefined
              }
            >
              {apiError.message}
            </Alert>
          )}

          <Button type="submit" variant="cta" size="lg" loading={pending} disabled={unavailable}>
            <LockKeyhole className="size-5" aria-hidden="true" /> Giữ phòng và thanh toán
          </Button>
          <p className="text-center text-xs text-ink-soft">
            Phòng được giữ trong thời gian ngắn (mặc định 15 phút) để bạn thanh toán. Bạn chưa bị trừ tiền ở bước này.
          </p>
          <LinkButton href={backToRooms} variant="ghost" size="sm">
            Quay lại chọn phòng
          </LinkButton>
        </Card>
      </div>
    </form>
  );
}
