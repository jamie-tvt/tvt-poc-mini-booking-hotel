import { SiteFooter } from "@/components/layout/SiteFooter";

/** Luồng khách vãng lai (không bắt đăng nhập): checkout, đơn theo mã + key, cổng thanh toán giả lập, tra cứu. */
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      <SiteFooter />
    </>
  );
}
