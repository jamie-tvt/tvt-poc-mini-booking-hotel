import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AlertTone = "info" | "success" | "warning" | "error";

const STYLES: Record<AlertTone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-blue-300 bg-blue-50 text-blue-950", Icon: Info },
  success: { box: "border-green-300 bg-green-50 text-green-900", Icon: CircleCheck },
  warning: { box: "border-amber-300 bg-amber-50 text-amber-900", Icon: TriangleAlert },
  error: { box: "border-red-300 bg-red-50 text-red-900", Icon: CircleAlert },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { box, Icon } = STYLES[tone];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", box, className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
