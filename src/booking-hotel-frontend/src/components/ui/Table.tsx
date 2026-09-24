import { cn } from "@/lib/utils/cn";

/** Bảng cuộn ngang trong khung riêng — trang không bị tràn ngang trên mobile. */
export function Table({ caption, children, className }: { caption: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-line bg-white", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap border-b border-line bg-brand-soft px-3 py-2.5 font-semibold text-ink", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("border-b border-line/70 px-3 py-2.5 align-top", className)}>
      {children}
    </td>
  );
}
