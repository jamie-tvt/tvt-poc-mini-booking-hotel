import Link from "next/link";
import { Hotel, Mail, MapPin, Phone } from "lucide-react";
import { APP_NAME } from "@/lib/config/env";

const linkCls = "text-ink-soft underline-offset-4 transition-colors duration-200 hover:text-brand hover:underline";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="flex items-center gap-2 font-heading text-lg font-bold text-ink-strong">
            <Hotel className="size-5 text-brand" aria-hidden="true" /> {APP_NAME}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Khách sạn, homestay miền Tây và biển đảo phía Nam — giá minh bạch đã gồm phí, giữ phòng tức thì, đặt không cần tài khoản.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink-strong">Dành cho khách</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link href="/hotels" className={linkCls}>
                Tìm khách sạn
              </Link>
            </li>
            <li>
              <Link href="/lookup" className={linkCls}>
                Tra cứu đơn đặt phòng
              </Link>
            </li>
            <li>
              <Link href="/portal" className={linkCls}>
                Cổng dành cho khách sạn
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ink-strong">Liên hệ</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" /> Bến Ninh Kiều, Cần Thơ
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" aria-hidden="true" /> 1900 0000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" aria-hidden="true" /> hotro@mekongstay.vn
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-xs text-ink-soft">
        © 2026 {APP_NAME} — Dự án mẫu POC Booking Hotel (môi trường demo, không giao dịch tiền thật).
      </p>
    </footer>
  );
}
