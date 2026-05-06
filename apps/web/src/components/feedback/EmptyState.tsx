import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{message}</p>
      {actionLabel && actionHref ? (
        <Button asChild className="mt-4" variant="secondary">
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && !actionHref ? (
        <Button className="mt-4" type="button" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
