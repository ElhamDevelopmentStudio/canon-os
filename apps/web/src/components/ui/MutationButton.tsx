import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function MutationButton({
  children,
  isLoading,
  loadingLabel = "Saving",
  disabled,
  ...props
}: ButtonProps & { isLoading?: boolean; loadingLabel?: string }) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
