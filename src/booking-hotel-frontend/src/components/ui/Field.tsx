import { useId } from "react";
import { cn } from "@/lib/utils/cn";

export const inputClasses = cn(
  "block w-full min-h-11 rounded-lg border border-line-strong bg-white px-3 py-2 text-base text-ink",
  "placeholder:text-ink-soft/80 transition-colors duration-200",
  "focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
  "aria-invalid:border-danger disabled:bg-muted",
);

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  srOnlyLabel?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Nhãn + ô nhập + gợi ý + lỗi dưới field (có aria-describedby). */
export function FieldShell({ id, label, error, hint, required, srOnlyLabel, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium text-ink", srOnlyLabel && "sr-only")}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type BaseProps = { label: string; error?: string; hint?: string; srOnlyLabel?: boolean; containerClassName?: string };

export function TextField({
  label,
  error,
  hint,
  srOnlyLabel,
  containerClassName,
  id,
  className,
  required,
  ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell {...{ id: fieldId, label, error, hint, required, srOnlyLabel }} className={containerClassName}>
      <input
        id={fieldId}
        className={cn(inputClasses, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  srOnlyLabel,
  containerClassName,
  id,
  className,
  required,
  ...rest
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell {...{ id: fieldId, label, error, hint, required, srOnlyLabel }} className={containerClassName}>
      <textarea
        id={fieldId}
        className={cn(inputClasses, "min-h-24", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  srOnlyLabel,
  containerClassName,
  id,
  className,
  required,
  children,
  ...rest
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell {...{ id: fieldId, label, error, hint, required, srOnlyLabel }} className={containerClassName}>
      <select
        id={fieldId}
        className={cn(inputClasses, "pr-8", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}
