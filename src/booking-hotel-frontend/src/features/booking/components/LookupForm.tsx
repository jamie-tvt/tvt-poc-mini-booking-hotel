"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { zodFieldErrors } from "@/lib/utils/validation";
import { bookingHref, bookingService } from "../services/bookingService";
import { lookupSchema } from "../validators/checkoutSchema";

/** Tra cứu đơn (FR-BK-005): mã đơn + email → nhận accessKey → trang chi tiết. */
export function LookupForm({ initialCode = "", initialEmail = "" }: { initialCode?: string; initialEmail?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = lookupSchema.safeParse({ bookingCode: code, email });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setError(null);
    setPending(true);
    try {
      const b = await bookingService.lookup(parsed.data.bookingCode, parsed.data.email);
      router.push(bookingHref(b.bookingCode, b.accessKey));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "Không tìm thấy đơn khớp mã và email này. Kiểm tra lại mã đơn (dạng HB-XXXXXX) và email đã dùng khi đặt."
          : errorMessage(err),
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="lookup-code"
        label="Mã đơn"
        placeholder="HB-XXXXXX"
        autoCapitalize="characters"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={errors.bookingCode}
        required
        className="font-mono uppercase"
      />
      <TextField
        id="lookup-email"
        label="Email đã dùng khi đặt"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" loading={pending}>
        <Search className="size-5" aria-hidden="true" /> Tra cứu đơn
      </Button>
    </form>
  );
}
