import { cn } from "@/lib/utils";
import { forwardRef, type LabelHTMLAttributes } from "react";

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("text-sm font-medium text-zinc-700", className)}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
export { Label };
