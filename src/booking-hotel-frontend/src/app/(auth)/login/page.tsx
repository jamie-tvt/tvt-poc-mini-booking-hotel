import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <LoginForm next={firstParam(sp.next)} registered={firstParam(sp.registered) === "1"} demo={firstParam(sp.demo)} />;
}
