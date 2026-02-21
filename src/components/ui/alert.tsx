import { cn } from "@/lib/utils";

export function Alert({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "warning" | "error" | "success";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-4 text-sm",
        variant === "default" && "border-zinc-200 bg-zinc-50 text-zinc-800",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        variant === "error" && "border-red-200 bg-red-50 text-red-800",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        className
      )}
      {...props}
    />
  );
}
