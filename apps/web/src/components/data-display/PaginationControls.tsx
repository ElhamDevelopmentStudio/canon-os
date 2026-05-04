import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE, pageCount } from "@/lib/pagination";

export function PaginationControls({
  count,
  itemLabel,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
}: {
  count: number;
  itemLabel: string;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = pageCount(count, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const firstItem = count === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(safePage * pageSize, count);

  if (count <= pageSize && totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {count} {itemLabel}{count === 1 ? "" : "s"}.
      </p>
    );
  }

  return (
    <nav className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between" aria-label={`${itemLabel} pagination`}>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {firstItem}-{lastItem} of {count} {itemLabel}{count === 1 ? "" : "s"}. Page {safePage} of {totalPages}.
      </p>
      <div className="flex items-center gap-2">
        <Button disabled={safePage <= 1} size="sm" type="button" variant="secondary" onClick={() => onPageChange(safePage - 1)}>
          <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button disabled={safePage >= totalPages} size="sm" type="button" variant="secondary" onClick={() => onPageChange(safePage + 1)}>
          Next
          <ChevronRight aria-hidden="true" className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
