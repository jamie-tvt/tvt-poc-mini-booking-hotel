import { cn } from "@/lib/utils/cn";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-line bg-card p-4 shadow-card sm:p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, as: Tag = "h2" }: { className?: string; children: React.ReactNode; as?: "h2" | "h3" }) {
  return <Tag className={cn("text-lg font-bold text-ink", className)}>{children}</Tag>;
}
