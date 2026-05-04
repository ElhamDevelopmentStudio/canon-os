import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DialogShell } from "@/components/feedback/DialogShell";

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <DialogShell labelledBy="confirmation-dialog-title" onClose={onCancel}>
      <h2 className="text-lg font-semibold" id="confirmation-dialog-title">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button className={cn("bg-avoid text-white hover:bg-avoid/90")} type="button" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </DialogShell>
  );
}
