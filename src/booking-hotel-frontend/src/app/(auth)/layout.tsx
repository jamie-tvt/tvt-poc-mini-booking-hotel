import { SiteFooter } from "@/components/layout/SiteFooter";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">{children}</div>
      <SiteFooter />
    </>
  );
}
