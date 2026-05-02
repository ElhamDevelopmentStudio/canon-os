import { Trash2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DestructiveActionButton({ children, className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn("gap-2 bg-avoid text-white hover:bg-avoid/90", className)}
      type="button"
      {...props}
    >
      <Trash2 aria-hidden="true" className="h-4 w-4" />
      {children}
    </Button>
  );
}
