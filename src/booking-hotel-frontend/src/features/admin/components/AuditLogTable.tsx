"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/utils/format";
import { asList } from "@/lib/utils/query";
import { adminService } from "../services/adminService";

export function AuditLogTable() {
  const [page, setPage] = useState(0);
  const q = useApiQuery(`audit-${page}`, () => adminService.auditLogs(page));
  const rows = asList(q.data);
  const totalPages = q.data && !Array.isArray(q.data) ? q.data.totalPages : 1;

  return (
    <div>
      <PageHeader title="Nhật ký hệ thống" description="Ghi nhận thao tác quan trọng: đăng nhập, duyệt khách sạn, thanh toán, huỷ, hoàn tiền, chi trả, cài đặt." />
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có nhật ký" />
      ) : (
        <>
          <Table caption="Nhật ký hệ thống">
            <thead>
              <tr>
                <Th>Thời gian</Th>
                <Th>Người thực hiện</Th>
                <Th>Hành động</Th>
                <Th>Đối tượng</Th>
                <Th>Kết quả</Th>
                <Th>Chi tiết</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</Td>
                  <Td className="break-all">{l.userEmail ?? "Hệ thống"}</Td>
                  <Td className="font-mono text-xs">{l.action}</Td>
                  <Td className="text-xs">
                    {l.entityType ?? "—"}
                    {l.entityId !== undefined && l.entityId !== null ? ` #${l.entityId}` : ""}
                  </Td>
                  <Td>
                    {l.result ? <Badge tone={/fail|error|denied/i.test(l.result) ? "danger" : "success"}>{l.result}</Badge> : "—"}
                  </Td>
                  <Td className="max-w-xs text-xs text-ink-soft">{l.detail ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
