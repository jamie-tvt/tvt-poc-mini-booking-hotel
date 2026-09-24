import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { APP_NAME } from "@/lib/config/env";
import "@/styles/globals.css";

// Playfair Display (không dùng bản SC) + Be Vietnam Pro: cả hai có subset tiếng Việt.
const heading = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Đặt phòng khách sạn miền Tây`, template: `%s | ${APP_NAME}` },
  description: "Đặt phòng khách sạn, homestay miền Tây và biển đảo phía Nam: giá đã gồm phí, giữ phòng tức thì, không cần tài khoản.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A8A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh antialiased">
        <AuthProvider>
          <SiteHeader />
          <main id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
