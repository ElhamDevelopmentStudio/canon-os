import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingInput({
  label = "Rating",
  value,
  max = 10,
  onChange,
}: {
  label?: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {Array.from({ length: max }, (_, index) => index + 1).map((rating) => (
          <button
            aria-pressed={rating <= value}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
              rating <= value && "border-primary bg-primary/10 text-primary",
            )}
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
          >
            <span className="sr-only">Set rating to {rating}</span>
            <Star aria-hidden="true" className="h-4 w-4" />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
