import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileForm } from "@/features/account/components/ProfileForm";

export const metadata: Metadata = { title: "Tài khoản" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Tài khoản của tôi" description="Cập nhật họ tên và số điện thoại dùng để điền sẵn khi đặt phòng." />
      <ProfileForm />
    </>
  );
}
